function __TS__ArrayIsArray(this: void, value: any): boolean {
    if (type(value) !== "table") {
        return false;
    }

    if (value.length == null) {
        return false;
    }

    for (let i = 0; i < value.length; i++) {
        if (type(value[i]) === "nil") {
            return false;
        }
    }

    return true;
}
