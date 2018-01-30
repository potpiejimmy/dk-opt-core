
export function padNumber(num: number, digits: number): string {
    return (""+(Math.pow(10, digits)+num)).substr(1);
}

export function toBytesInt16 (num): number[] {
    return [
         (num & 0x0000ff00) >> 8,
         (num & 0x000000ff)
    ];
}

export function bsftHeader(len: number): number[] {
    return [
         0,0,0,0,
         (len & 0xff000000) >> 24,
         (len & 0x00ff0000) >> 16,
         (len & 0x0000ff00) >> 8,
         (len & 0x000000ff)
    ];
}
