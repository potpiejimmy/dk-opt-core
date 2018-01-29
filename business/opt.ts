import { ISOBasePackager, ISOUtil, ISOMsg } from 'jspos';
import { OPT_ISO_MSG_FORMAT } from './optiso';
import * as moment from 'moment';
import * as net from 'net';
import * as Hsm from './hsm';

export function optInitialize(): Promise<any> {

    let d = moment(new Date());
    let traceNo = 1;
    let isoPacker = new ISOBasePackager();

    isoPacker.setFieldPackager(OPT_ISO_MSG_FORMAT);

    return Hsm.readAdminValues().then(config => 
        Hsm.createSessionKey("KS_MES").then(rnd_mes =>
        Hsm.createSessionKey("KS_MAC").then(rnd_mac =>
        Hsm.readKeyProperties("K_INIT").then(k_init => {

            /* Personalisierungsanfrage */

            let isoMsg = isoPacker.createISOMsg();
            isoMsg.setMTI("8900"); /* MSGTYPE 8900 Anfrage */
            isoMsg.setField(3, "989999"); /* AKZ     98xxxx Initialisierung, 99xxxx Personalisierung, xxxx = max. unterst. Nachrichtenlaenge */
            isoMsg.setField(11, padNumber(traceNo,6)); /* Tracenummer */
            isoMsg.setField(12, d.format('HHmmss'));
            isoMsg.setField(13, d.format('MMDD'));
            isoMsg.setField(33, "F0F3000000"); /* ID zwischengeschalteter Rechner */
            isoMsg.setField(41, config.terminalid);   /* Terminal-ID */
            isoMsg.setField(42, "00000000" + config.betreiberblz); /* Betreiber-BLZ in rechten vier Bytes */
            isoMsg.setField(53, "0100000002000000"); /* Sicherheitsverfahren, fix */
            isoMsg.setField(57, "F0F3F4" + padNumber(k_init.GN, 2) + padNumber(k_init.KV, 2) + rnd_mes + config.zkano); /* Lg 034: Schluesselgenerationsnummer GN(1), Schluessel-Version KV(1), Zufallszahl RND_MES(16), ZKA-No.(16) */
            isoMsg.setField(61, "F0F0F7" + config.ozp); /* Lg 007: Onlinezeitpunkt(7) */
            isoMsg.setField(62, "F0F1F6" + rnd_mac); /* Daten, RND_MAC bei Personalisierungsanfrage (16) */
            isoMsg.setField(64, "1234567890123456"); /* MAC, 8 Bytes */
            
            let msgArray = isoMsg.pack();
            let msgArrayWithLen = toBytesInt16(msgArray.length).concat(msgArray);
            console.log(msgArray.length);
            console.log(ISOUtil.hexString(msgArrayWithLen));

            return sendAndReceive(config.ps_host, config.ps_port, Buffer.from(msgArrayWithLen));
        }
    ))));
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

function padNumber(num: number, digits: number): string {
    return (""+(Math.pow(10, digits)+num)).substr(1);
}

function toBytesInt16 (num): number[] {
    return [
         (num & 0x0000ff00) >> 8,
         (num & 0x000000ff)
    ];
}
