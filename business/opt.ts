import * as ISO8583 from 'iso_8583';

export function optInitialize(): Promise<string> {
    let isoMsg = new ISO8583({
        0: "0100",
        2: "4761739001010119",
        3: "000000",
        4: "000000005000",
        7: "0911131411"
    })
    
    console.log(isoMsg);
    console.log(isoMsg.getBitMapFields());

    return Promise.resolve(JSON.stringify(isoMsg.Msg, null, 4));
}
