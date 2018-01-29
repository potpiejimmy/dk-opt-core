import * as jsonfile from 'jsonfile';
import * as crypto from 'crypto';

const HSM_FILE: string = 'hsm.json';

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

export function createSessionKey(id: string): Promise<string> {
    // create and store session key, return the RND value as hex string
    return Promise.resolve(crypto.randomBytes(16).toString('hex'));
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
    return jsonfile.readFileSync(HSM_FILE);
}

function writeHSM(data: any) {
    jsonfile.writeFileSync(HSM_FILE, data, {spaces: 4});
}

