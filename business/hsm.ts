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

export function createSessionKey(id: string, key_id: string): Promise<string> {
    // id must be one of MES, MAC, IMP, ENC
    // key_id must be one of K_UR, K_INIT, K_PERS (one of the key IDs in the config.json keystore)

    // session key KS is derived from key K_PERS_T like this:
    // KS = PA(d*(KPERS_T XOR CV1|CV1)(RND1)|d*(KPERS_T XOR CV2|CV2)(RND2)). 
    // create and store session key, return the RND value as hex string
    let keystore = readHSM().keystore;

    let rnd = crypto.randomBytes(16);
    let cv: Buffer = Buffer.from(keystore['CV_'+id], 'hex');
    let basekey = Buffer.from(keystore[key_id].data, 'hex');

    let enckey: Buffer = Buffer.alloc(16);
    for (var i = 0; i < 16; ++i) enckey[i] = basekey[i] ^ cv[i%8]; // XOR with CV1|CV1
    let result1 = dec3des(enckey, rnd.slice(0, 8)); // decode RND1

    enckey = Buffer.alloc(16);
    for (var i = 0; i < 16; ++i) enckey[i] = basekey[i] ^ cv[8+(i%8)]; // XOR with CV2|CV2
    let result2 = dec3des(enckey, rnd.slice(8, 16)); // decode RND2

    let result = Buffer.concat([result1,result2]);
    // TODO Parity Adjustment

    return Promise.resolve(result.toString('hex'));
}

function dec3des(enckey, data) {
    const decipher = crypto.createDecipher('des-ede3', enckey);
    let res = decipher.update(data);
    return Buffer.concat([res, decipher.final()]);
}

export function createMAC(msg: any): any {
    // calculate mac for given message using KS_MES, return mac.
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

