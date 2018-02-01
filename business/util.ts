
export function padNumber(num: number, digits: number): string {
    return (""+(Math.pow(10, digits)+num)).substr(1);
}

export function toBytesInt16 (num): number[] {
    return [
         (num & 0x0000ff00) >> 8,
         (num & 0x000000ff)
    ];
}

export function bsftHeaderEncode(len: number): number[] {
    return [
         0,0,0,0,
         (len & 0xff000000) >> 24,
         (len & 0x00ff0000) >> 16,
         (len & 0x0000ff00) >> 8,
         (len & 0x000000ff)
    ];
}

export function bsftHeaderDecode(buf: Buffer): number {
    let len = 0;
    for (let i=0; i < 8; i++) {
        len <<= 8;
        len |= buf[i];
    }
    return len;
}

export function asyncLoopImpl(array: any[], iter: (element: any, next: () => void) => void, complete: () => void, index: number = 0) {
    if (index >= array.length) complete();
    else iter(array[index], () => asyncLoopImpl(array, iter, complete, ++index));
}

export function asyncLoop(array: any[], iter: (element: any, next: () => void) => void): Promise<any> {
    return new Promise((resolve, reject) => asyncLoopImpl(array, iter, () => resolve()));
}

export function asyncWhileImpl(condition: () => boolean, iter: (next: () => void) => void, complete: () => void) {
    if (!condition()) complete();
    else iter(() => asyncWhileImpl(condition, iter, complete));
}

export function asyncWhile(condition: () => boolean, iter: (next: () => void) => void): Promise<any> {
    return new Promise((resolve, reject) => asyncWhileImpl(condition, iter, () => resolve()));
}

const e2a = [
    0,  1,  2,  3,156,  9,134,127,151,141,142, 11, 12, 13, 14, 15,
   16, 17, 18, 19,157,133,  8,135, 24, 25,146,143, 28, 29, 30, 31,
  128,129,130,131,132, 10, 23, 27,136,137,138,139,140,  5,  6,  7,
  144,145, 22,147,148,149,150,  4,152,153,154,155, 20, 21,158, 26,
   32,160,161,162,163,164,165,166,167,168, 91, 46, 60, 40, 43, 33,
   38,169,170,171,172,173,174,175,176,177, 93, 36, 42, 41, 59, 94,
   45, 47,178,179,180,181,182,183,184,185,124, 44, 37, 95, 62, 63,
  186,187,188,189,190,191,192,193,194, 96, 58, 35, 64, 39, 61, 34,
  195, 97, 98, 99,100,101,102,103,104,105,196,197,198,199,200,201,
  202,106,107,108,109,110,111,112,113,114,203,204,205,206,207,208,
  209,126,115,116,117,118,119,120,121,122,210,211,212,213,214,215,
  216,217,218,219,220,221,222,223,224,225,226,227,228,229,230,231,
  123, 65, 66, 67, 68, 69, 70, 71, 72, 73,232,233,234,235,236,237,
  125, 74, 75, 76, 77, 78, 79, 80, 81, 82,238,239,240,241,242,243,
   92,159, 83, 84, 85, 86, 87, 88, 89, 90,244,245,246,247,248,249,
   48, 49, 50, 51, 52, 53, 54, 55, 56, 57,250,251,252,253,254,255
  ];

export function ebcdicToAsciiS (hexstring: string): string {
    return ebcdicToAsciiB(Buffer.from(hexstring, 'hex'));
}

export function ebcdicToAsciiB (buf: Buffer): string {
    for (let i=0; i<buf.length; i++) buf[i] = e2a[buf[i]];
    return buf.toString();
}
