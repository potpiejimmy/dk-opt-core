import * as ISO8583 from 'iso_8583';
import * as moment from 'moment';

export function optInitialize(): Promise<string> {

    let d = moment(new Date());

    /* Personalisierungsanfrage */

    let isoMsg = new ISO8583({
        0:  "8900",   /* MSGTYPE 8900 Anfrage */
        3:  "989999", /* AKZ     98xxxx Initialisierung, 99xxxx Personalisierung */
        11: "000001", /* Tracenummer */
        12: d.format('hhmmss'),
        13: d.format('MMDD'),
        33: "F0F3123456", /* ID zwischengeschalteter Rechner */
        41: "12345678",   /* Terminal-ID */
        42: "0000000050050000", /* Betreiber-BLZ in rechten vier Bytes */
        53: "0100000002000000", /* Sicherheitsverfahren, fix */
        57: "F0F3F4", /* Lg 034: Schluesselgenerationsnummer GN(1), Schluessel-Version KV(1), Zufallszahl RND_MES(16), ZKA-No.(16) */
        61: "F0F0F7JJJJMMTTHHMMSS", /* Lg 007: Onlinezeitpunkt(7) */
//        62: "FnFnFn...", /* Daten, RND_MAC bei Personalisierungsanfrage (16) */
        64: "1234567890123456" /* MAC, 8 Bytes */
    })
    
    console.log(isoMsg);
    console.log(isoMsg.getBitMapFields());

    return Promise.resolve(isoMsg.Msg);
}
