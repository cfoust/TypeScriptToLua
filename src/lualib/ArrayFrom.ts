function __TS__ArrayFrom(this: void, value: any[]): any[] {
    const result: any[] = [];
    for (let i = 0; i < value.length; i++) {
        result.push(value[i]);
    }
    return result;
}
