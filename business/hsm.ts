import * as jsonfile from 'jsonfile';
import * as crypto from 'crypto';

const CONFIG_FILE: string = 'config.json';

/* start public interface */

export function readAdminValues(): Promise<any> {
    return Promise.resolve(readHSM().admin);
}

export function readAdminValue(id: string): Promise<string> {
    return readAdminValues().then(vals => vals[id]);
}

export function writeAdminValue(id: string, val: string): Promise<any> {
    let data = readHSM();
    data.admin[id] = val;
    writeHSM(data);
    return Promise.resolve('"success"');
}

export function readKeyProperties(id: string): Promise<any> {
    return Promise.resolve(readHSM().keystore[id]);
}

export function importSessionKey(id: string, rnd: string) {

}

export function createSessionKey(id: string, base_key_id: string): Promise<any> {
    // id must be one of MES, MAC, IMP, ENC
    // key_id must be one of K_UR, K_INIT, K_PERS (one of the key IDs in the config.json keystore)

    // session key KS is derived from key K_PERS_T like this:
    // KS = PA(d*(KPERS_T XOR CV1|CV1)(RND1)|d*(KPERS_T XOR CV2|CV2)(RND2)). 
    // create and store session key, return the RND value as hex string
    let hsm = readHSM();

    let rnd = crypto.randomBytes(16);
    let cv: Buffer = Buffer.from(hsm.keystore['CV_'+id], 'hex');
    let basekey = Buffer.from(hsm.keystore[base_key_id].keydata, 'hex');
    let enckey: Buffer = Buffer.alloc(16);

    for (var i = 0; i < 16; ++i) enckey[i] = basekey[i] ^ cv[i%8]; // XOR with CV1|CV1
    let result1 = dec3des(enckey, rnd.slice(0, 8)); // decode RND1

    for (var i = 0; i < 16; ++i) enckey[i] = basekey[i] ^ cv[8+(i%8)]; // XOR with CV2|CV2
    let result2 = dec3des(enckey, rnd.slice(8, 16)); // decode RND2

    let result = Buffer.concat([result1,result2]);
    adjustParity(result);
    let ksstring = result.toString('hex');
    let rndstring = rnd.toString('hex');
    console.log("RND_"+id+": " +rndstring);
    console.log("KS_"+id+": " +ksstring);

    let sessionKeyData = {
        rnd: rndstring,
        keydata: ksstring
    };

    // Write to HSM
    //hsm.keystore['KS_'+id] = sessionKeyData;
    //writeHSM(hsm);

    return Promise.resolve(sessionKeyData);
}

function adjustParity(buf: Buffer): void {
   for(let i = 0; i < buf.length; i++)
   {
      let even: boolean = true;
      for(let j = 0; j < 8; j++)
         if (buf[i] & (1 << j)) even = !even;
      if (even) buf[i] ^= 1;
   }
}

function dec3des(enckey, data) {
    // Note: important to expand the key ourselves and use creatCipheriv and NOT createCipher with an empty IV of length 0
    const decipher = crypto.createDecipheriv('des-ede3', Buffer.concat([enckey, enckey.slice(0,8)]), Buffer.alloc(0));
    decipher.setAutoPadding(false);
    let res = decipher.update(data);
    return Buffer.concat([res, decipher.final()]);
}

function encdecdes(enckey, data, decode: boolean) {
    const cipher = decode ? 
        crypto.createDecipheriv('des-ecb', Buffer.from(enckey, 'hex'), Buffer.alloc(0)) :
        crypto.createCipheriv('des-ecb', Buffer.from(enckey, 'hex'), Buffer.alloc(0));
    
    cipher.setAutoPadding(false);
    let res = cipher.update(data);
    return Buffer.concat([res, cipher.final()]);
}

export function createMAC(sessionKey: any, msg: Array<any>): any {

    // Calculate Retail MAC (ISO 9797 Algorithm 3) using left and right part of KS as K and K'
    let k1 = sessionKey.keydata.substr(0,16);
    let k2 = sessionKey.keydata.substr(16,32);
    console.log("K:  " + k1);
    console.log("K': " + k2);

    // add padding to input message by adding 0s until length is a multiple of 8
    while (msg.length % 8 > 0) msg.push(0);

    let hh = Buffer.from([0,0,0,0,0,0,0,0]); // IV

    // Chain and encrypt 8-byte blocks
    for (let x = 0; x < msg.length / 8; x++) {
        let block = msg.slice(x*8, (x+1)*8);
        for (let i=0; i<8; i++) hh[i] ^= block[i];
        hh = encdecdes(k1, hh, false);
    }

    let result = encdecdes(k1, encdecdes(k2, hh, true), false);
    let mac = result.toString('hex');
    console.log("Retail-CBC-MAC: " + mac);
    return mac;
}

export function verifyMAC(msg: any, mac: any): any {
    // verify mac for given message using KS_MES
}

export function importLDIs(data: any) {

}

export function exportLDIs(): any {

}

/* end public interface */

function readHSM(): any {
    return jsonfile.readFileSync(CONFIG_FILE);
}

function writeHSM(data: any) {
    jsonfile.writeFileSync(CONFIG_FILE, data, {spaces: 4});
}

