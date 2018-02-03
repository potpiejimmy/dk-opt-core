import { ISOBasePackager, ISOMsg } from 'jspos';
import { OPT_ISO_MSG_FORMAT } from './isomsg';
import * as moment from 'moment';
import * as net from 'net';
import * as Hsm from './hsm';
import * as Util from './util';

export function optPreInitialize(): Promise<any> {
    return optProcess("K_UR", buildOptPreInitMsg);
}

export function optInitialize(): Promise<any> {
    return optProcess("K_INIT", buildOptInitMsg);
}

export function optPersonalize(): Promise<any> {
    return optProcess("K_PERS", buildOptPersMsg);
}

function optProcess(base_key_id: string, msgBuilder: (isoPacker: ISOBasePackager, traceNo: number, config: any, rnd_mes: string, rnd_mac: string, key: any) => any): Promise<any> {

    let traceNo = 1;
    let isoPacker = new ISOBasePackager();

    isoPacker.setFieldPackager(OPT_ISO_MSG_FORMAT);

    return Hsm.readAdminValues().then(config => 
        Hsm.createSessionKey("MES", base_key_id).then(rnd_mes =>
        Hsm.createSessionKey("MAC", base_key_id).then(rnd_mac =>
        Hsm.readKeyProperties().then(keystore => {

            let keyprops = keystore[base_key_id];
            let isoMsg = msgBuilder(isoPacker, traceNo, config, rnd_mes, rnd_mac, keyprops);
            isoMsg.setField(64, "0000000000000000"); /* set empty BMP64 before calculating MAC */
            let msg = isoMsg.pack();

            return sendAndReceive(msg, isoMsg, config, base_key_id, isoPacker).then(bmp62result => {
                if (bmp62result) {
                    // bmp62result enthaelt bereits die neue BMP62 mit MACs aus RND'_MAC und K_PERS
                    return optProcessConfirm(isoMsg, bmp62result, isoPacker);
                }
            });
        }
    ))))
    .then(() => { return {status: "Der Vorgang war erfolgreich."};})
    .catch(err => Promise.resolve({status: ""+err}));
}

function optProcessConfirm(reqIsoMsg: any, bmp62result: any, isoPacker: ISOBasePackager): Promise<any> {
    // Die Quittungsnachricht ist wie die Anfragenachricht aufgebaut (reqIsoMsg)
    // Nur MTI und BMP 57, 61 und 62 sind neu zu setzen
    // Die Message-MAC und die Werte in BMP57 beziehen sich immer
    // bereits auf K_PERS, auch bei der Initialisierung
    let key_id = "K_PERS";
    return Hsm.readAdminValues().then(config =>  // aktuellen Online-Zeitpunkt neu lesen
        Hsm.createSessionKey("MES", key_id).then(rnd_mes => // neuen KS_MES generieren
        Hsm.readKeyProperties().then(keystore => {

            let key = keystore[key_id];

            // Felder in Anfragenachricht (reqIsoMsg) neu setzen
            reqIsoMsg.setMTI("8902"); /* MSGTYPE 8902 Quittung */
            reqIsoMsg.setField(57, "F0F3F4" + Util.padNumber(key.GN, 2) + Util.padNumber(key.KV, 2) + rnd_mes + config.zkano); /* Lg 034: Schluesselgenerationsnummer GN(1), Schluessel-Version KV(1), Zufallszahl RND_MES(16), ZKA-No.(16) */
            reqIsoMsg.setField(61, "F0F0F7" + config.ozp); /* Lg 007: Onlinezeitpunkt(7) */
            reqIsoMsg.getFieldPackager(62).setLength(bmp62result.length);
            reqIsoMsg.setField(62, Buffer.from(bmp62result).toString('hex'));
            let msg = reqIsoMsg.pack();

            return sendAndReceive(msg, reqIsoMsg, config, key_id, isoPacker);
        }
    )));
}

function sendAndReceive(msg: Array<any>, isoMsg: any, config: any, base_key_id: string, isoPacker: ISOBasePackager): Promise<any> {
    // Set message MAC before sending out
    return Hsm.createMAC("MES", msg.slice(0, msg.length-8)).then(mac => {
        isoMsg.setField(64, mac);
        msg = isoMsg.pack();

        let msgWithBSFTHeader = Util.bsftHeaderEncode(msg.length + 8).concat(msg);
        console.log(">>> " + Buffer.from(msgWithBSFTHeader).toString('hex'));

        return sendAndReceiveImpl(config.ps_host, config.ps_port, Buffer.from(msgWithBSFTHeader)).then(data => {
            console.log("<<< " + data.toString('hex'));
            return handleISOResponse(base_key_id, isoPacker, data);
        });
    });
}

function fixResultFieldVariableLength(bmp: number, len_length: number, isoPacker: ISOBasePackager, isoMessage: any, data: Buffer) {
    // fetch length from length field
    let bmp_len = parseInt(Util.ebcdicToAscii(Buffer.from(isoMessage.fields[bmp].value.slice(0,len_length))));
    //console.log("LEN BMP"+bmp + ": " + bmp_len);
    isoPacker.getFieldPackager(bmp).setLength(len_length + bmp_len);
    isoMessage.unpack(data); // re-unpack
}

function handleISOResponse(base_key_id: string, isoPacker: ISOBasePackager, data: Buffer): Promise<any> {
    let isoAnswer = isoPacker.createISOMsg();
    isoAnswer.unpack(data);

    // fix the variable length fields according to their length value
    fixResultFieldVariableLength(57, 3, isoPacker, isoAnswer, data);
    fixResultFieldVariableLength(61, 3, isoPacker, isoAnswer, data);
    fixResultFieldVariableLength(62, 3, isoPacker, isoAnswer, data);

    let ac = isoAnswer.fields[39].value[0];
    let mac = Buffer.from(isoAnswer.fields[64].value).toString('hex');
    let rnd_mes = Buffer.from(isoAnswer.fields[57].value.slice(5,21)).toString('hex');

    console.log("MTI:   " + isoAnswer.getMTI());
    console.log("BMP39: " + ac);

    // TODO:
    // Generell:
    // Ueberpruefe Abwicklungskennzeichen,  Nachrichtentyp, und  Trace-Nummer
    // Bei Initialisierung zusaetzlich:
    // Pruefe ZKA-Nummer

    // import KS_MES' for response message using RND_MES from BMP57 response
    return Hsm.importSessionKey("MES", base_key_id, rnd_mes).then(() =>
           Hsm.verifyMAC("MES", [...data.slice(0, data.length-8)], mac).then(macOkay => {

        // verify MAC:
        if (!macOkay) {
            console.log("MAC invalid.")
            throw "Message MAC is invalid";
        }
        console.log("Message MAC is valid, continue.");

        let result = Promise.resolve();

        // OZP entnehmen und speichern
        let ozp = isoAnswer.fields[61].value.slice(3,10);
        result = result.then(() => Hsm.writeAdminValue("ozp", Buffer.from(ozp).toString('hex')));

        if (ac) {
            return Promise.reject("AC (BMP39) = " + ac);
        }

        let akz = isoAnswer.fields[3].value[0];

        // Extrahiere Daten aus BMP62:
        let bmp62 = isoAnswer.fields[62].value;

        let rnd_mac, rnd_imp, rnd_enc: string;
        let index = 3; // skip length field
        let groupNum: number;

        if (akz == 0x96) {
            // Vor-Initialisieurng
            index += 3; // skip Nummer des logischen Teil-HSM
            let zkano = Buffer.from(bmp62.slice(index,index+=16)).toString('hex');
            rnd_imp = Buffer.from(bmp62.slice(index,index+=16)).toString('hex');
            groupNum = 1; // Nur eine implizite Gruppe in Vor-Initialisierungsantwort
            result = result.then(()=>Hsm.writeAdminValue('zkano', zkano)); // write ZKA number to config
        } else {
            // Initialisierung oder Personalisierung
            rnd_mac = Buffer.from(bmp62.slice(index,index+=16)).toString('hex'); // RND'_MAC
            let rndKennung = bmp62[index++];
            if (rndKennung & 0x1) // RND_IMP eingestellt?
                rnd_imp = Buffer.from(bmp62.slice(index,index+=16)).toString('hex');
            if (rndKennung & 0x2) // RND_ENC eingestellt?
                rnd_enc = Buffer.from(bmp62.slice(index,index+=16)).toString('hex');
            groupNum = bmp62[index++];
        }

        // import KS_IMP if available
        if (rnd_imp) result = result.then(()=>Hsm.importSessionKey("IMP", base_key_id, rnd_imp));
        // import KS_ENC if available
        if (rnd_enc) result = result.then(()=>Hsm.importSessionKey("ENC", base_key_id, rnd_enc));

        let bmp62result = [groupNum];
        return result.then(() => Util.asyncWhile(() => groupNum > 0, () => {

            // calculate length of current group
            let groupLen = 4; // start with group id + ldi number fields = 4
            let ldiNum = bmp62[index + 3]; // Anzahl der LDIs
            for (let i=0; i<ldiNum; i++) {
                groupLen += 2; // Nummer LDI + Algorithmus-Code
                groupLen += 1 + bmp62[index + groupLen]; // Laenge der LDI-Daten
            }
            groupLen += 8; // MAC
            
            let groupData = bmp62.slice(index,index+=groupLen);
            return Hsm.importLDIGroup(Buffer.from(groupData)).then(groupIdAndVersion => {
                // group successfully imported, now replace
                groupNum--;
                if (rnd_mac) {
                    // re-create KS_MAC from RND'_MAC and K_PERS
                    // Note that we need to create it here AFTER import because we need to use
                    // the newly created K_PERS on Initialisierung.
                    return Hsm.importSessionKey("MAC", "K_PERS", rnd_mac).then(() => 
                           Hsm.exportStandardLDI(groupIdAndVersion).then(stldiWithMac => {
                        // add to bmp62result
                        bmp62result = bmp62result.concat(stldiWithMac);
                    }));
                }
            });
        })).then(() => {
            if (rnd_mac) {
                // return the new BMP62 with the MACed standard LDIs of all groups
                let newLenField = Util.asciiToEbcdic(Util.padNumber(bmp62result.length, 3)); // 3 digits length field in EBCDIC
                return [...newLenField].concat(bmp62result);
            } else {
                return null;
            }
        });
    }));
}

function buildOptPreInitMsg(isoPacker: ISOBasePackager, traceNo: number, config: any, rnd_mes: string, rnd_mac: string, key: any): any {
    
    /* Vor-Initialisierungsanfrage */
    let isoMsg = isoPacker.createISOMsg();
    isoMsg.setMTI("8900"); /* MSGTYPE 8900 Anfrage */
    isoMsg.setField(3, "960010"); /* AKZ 960010 fix */
    setOptCommonFields(isoMsg, traceNo, config);
    isoMsg.setField(57, "F0F3F4" + Util.padNumber(key.GN, 2) + Util.padNumber(key.KV, 2) + rnd_mes + config.herstellerid + config.herstellerserialno); /* Lg 034: Schluesselgenerationsnummer GN(1), Schluessel-Version KV(1), Zufallszahl RND_MES(16), Hersteller-ID (6), Hersteller-Seriennummer(10) */
    isoPacker.getFieldPackager(62).setLength(22);
    isoMsg.setField(62, "F0F1F9000000" + rnd_mac); /* Daten, Nummer logischer Teil-HSM (3) + RND_MAC (16) bei Vor-Initialisierung */
    return isoMsg;
}

function buildOptInitMsg(isoPacker: ISOBasePackager, traceNo: number, config: any, rnd_mes: string, rnd_mac: string, key: any): any {
    
    /* Initialisierungsanfrage */
    let isoMsg = isoPacker.createISOMsg();
    isoMsg.setMTI("8900"); /* MSGTYPE 8900 Anfrage */
    isoMsg.setField(3, "989999"); /* AKZ     98xxxx Initialisierung, 99xxxx Personalisierung, xxxx = max. unterst. Nachrichtenlaenge */
    setOptCommonFields(isoMsg, traceNo, config);
    isoMsg.setField(33, "F0F3000000"); /* ID zwischengeschalteter Rechner */
    isoMsg.setField(57, "F0F3F4" + Util.padNumber(key.GN, 2) + Util.padNumber(key.KV, 2) + rnd_mes + config.zkano); /* Lg 034: Schluesselgenerationsnummer GN(1), Schluessel-Version KV(1), Zufallszahl RND_MES(16), ZKA-No.(16) */
    isoPacker.getFieldPackager(62).setLength(19);
    isoMsg.setField(62, "F0F1F6" + rnd_mac); /* Daten, RND_MAC bei Personalisierungsanfrage (16) */
    return isoMsg;
}

function buildOptPersMsg(isoPacker: ISOBasePackager, traceNo: number, config: any, rnd_mes: string, rnd_mac: string, key: any): any {
    
    /* Personalisierungsanfrage (wie Initialisierungsanfrage, bis auf AKZ) */
    let isoMsg = buildOptInitMsg(isoPacker, traceNo, config, rnd_mes, rnd_mac, key);
    isoMsg.setField(3, "999999"); /* AKZ     98xxxx Initialisierung, 99xxxx Personalisierung, xxxx = max. unterst. Nachrichtenlaenge */
    return isoMsg;
}

function setOptCommonFields(isoMsg: any, traceNo: number, config: any) {
    let d = moment(new Date());

    isoMsg.setField(11, Util.padNumber(traceNo,6)); /* Tracenummer */
    isoMsg.setField(12, d.format('HHmmss'));
    isoMsg.setField(13, d.format('MMDD'));
    isoMsg.setField(41, config.terminalid);   /* Terminal-ID */
    isoMsg.setField(42, "00000000" + config.betreiberblz); /* Betreiber-BLZ in rechten vier Bytes */
    isoMsg.setField(53, "0100000002000000"); /* Sicherheitsverfahren, fix */
    isoMsg.setField(61, "F0F0F7" + config.ozp); /* Lg 007: Onlinezeitpunkt(7) */
}

function sendAndReceiveImpl(host: string, port: number, msg: Buffer): Promise<any> {

    return new Promise((resolve, reject) => {

        let psConn = new net.Socket();
        let receiveBuffer = Buffer.alloc(0);
        let expectingBytes = 0;

        psConn.connect(port, host, () => {
            psConn.write(msg);
        });

        // Add a 'data' event handler for the client socket
        // data is what the server sent to this socket
        psConn.on('data', function(data) {
            console.log('RECEIVED ' + data.length + ' BYTES.');
            receiveBuffer = Buffer.concat([receiveBuffer, data]);

            if (receiveBuffer.length >= 8) {
                // header received
                if (!expectingBytes) expectingBytes = Util.bsftHeaderDecode(receiveBuffer);

                if (receiveBuffer.length >= expectingBytes) {
                    // received all data, over and out.
                    psConn.destroy();
                    resolve(receiveBuffer.slice(8, expectingBytes));
                }
            }
        });

        // Add a 'close' event handler for the client socket
        psConn.on('close', function() {
            console.log('Connection closed');
        });

        // Add a 'close' event handler for the client socket
        psConn.on('error', function(err) {
            console.log('Error: ' + err);
            psConn.destroy();
            reject(err);
        });
    });
}
