import * as jsonfile from 'jsonfile';

const HSM_FILE: string = 'hsm.json';

function readHSM(): any {
    return jsonfile.readFileSync(HSM_FILE);
}

function writeHSM(data: any) {
    jsonfile.writeFileSync(HSM_FILE, data);
}

export function readValue(id: string): Promise<string> {
    return Promise.resolve(readHSM()[id]);
}

export function writeValue(id: string, val: string): Promise<any> {
    writeHSM(readHSM()[id] = val);
    return Promise.resolve('success');
}
