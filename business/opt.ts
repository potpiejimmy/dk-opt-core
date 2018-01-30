import { ISOBasePackager, ISOUtil, ISOMsg } from 'jspos';
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

function optProcess(key_id: string, msgBuilder: (isoPacker: ISOBasePackager, traceNo: number, config: any, rnd_mes: string, rnd_mac: string, key: any) => any): Promise<any> {

    let traceNo = 1;
    let isoPacker = new ISOBasePackager();

    isoPacker.setFieldPackager(OPT_ISO_MSG_FORMAT);

    return Hsm.readAdminValues().then(config => 
        Hsm.createSessionKey("MES", key_id).then(ks_mes =>
        Hsm.createSessionKey("MAC", key_id).then(ks_mac =>
        Hsm.readKeyProperties(key_id).then(k_ur => {

            let isoMsg = msgBuilder(isoPacker, traceNo, config, ks_mes.rnd, ks_mac.rnd, k_ur);
            isoMsg.setField(64, "0000000000000000"); /* set empty BMP64 before calculating MAC */
            let msg = isoMsg.pack();
            isoMsg.setField(64, Hsm.createMAC(ks_mes, msg.slice(0, msg.length-8)));
            msg = isoMsg.pack();

            let msgWithBSFTHeader = Util.bsftHeader(msg.length + 8).concat(msg);
            console.log(msg.length);
            console.log(ISOUtil.hexString(msgWithBSFTHeader));

            return sendAndReceive(config.ps_host, config.ps_port, Buffer.from(msgWithBSFTHeader));
        }
    ))));
}

function buildOptPreInitMsg(isoPacker: ISOBasePackager, traceNo: number, config: any, rnd_mes: string, rnd_mac: string, key: any): any {
    
    /* Personalisierungsanfrage */
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
    
    /* Personalisierungsanfrage */
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

function sendAndReceive(host: string, port: number, msg: Buffer): Promise<any> {

    return new Promise((resolve, reject) => {
        let psConn = new net.Socket();
        psConn.connect(port, host, () => {
            psConn.write(msg);
        });

        // Add a 'data' event handler for the client socket
        // data is what the server sent to this socket
        psConn.on('data', function(data) {
            console.log('DATA: ' + data);
            // Close the client socket completely
            psConn.destroy();
        });

        // Add a 'close' event handler for the client socket
        psConn.on('close', function() {
            console.log('Connection closed');
        });

        // Add a 'close' event handler for the client socket
        psConn.on('error', function(err) {
            console.log('Error: ' + err);
            resolve({status: ""+err});
        });
    });
}
