import * as jsonfile from 'jsonfile';

const HSM_FILE: string = 'hsm.json';

function readHSM(): any {
    return jsonfile.readFileSync(HSM_FILE);
}

function writeHSM(data: any) {
    jsonfile.writeFileSync(HSM_FILE, data, {spaces: 4});
}

export function readAll(): Promise<string> {
    return Promise.resolve(readHSM());
}

export function readValue(id: string): Promise<string> {
    return Promise.resolve(readHSM()[id]);
}

export function writeValue(id: string, val: string): Promise<any> {
    let data = readHSM();
    data[id] = val;
    writeHSM(data);
    return Promise.resolve('"success"');
}
