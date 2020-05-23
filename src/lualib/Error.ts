interface ErrorType {
    name: string;
    new (...args: any[]): Error;
}

function __TS__GetErrorStack(): string {
    return "";
}

function __TS__WrapErrorToString<T extends Error>(getDescription: (this: T) => string): (this: T) => string {
    return function(this: Error): string {
        return getDescription.call(this);
    };
}

function __TS__InitErrorClass(Type: ErrorType, name: string): any {
    Type.name = name;
    return setmetatable(Type, {
        __call: (_self: any, message: string) => new Type(message),
    });
}

Error = __TS__InitErrorClass(
    class implements Error {
        public name = "Error";
        public stack: string;

        constructor(public message = "") {
            this.stack = "";
            const metatable = getmetatable(this);
            if (!metatable.__errorToStringPatched) {
                metatable.__errorToStringPatched = true;
                metatable.__tostring = __TS__WrapErrorToString(metatable.__tostring);
            }
        }

        public toString(): string {
            return this.message !== "" ? `${this.name}: ${this.message}` : this.name;
        }
    },
    "Error"
);

for (const errorName of ["RangeError", "ReferenceError", "SyntaxError", "TypeError", "URIError"]) {
    globalThis[errorName] = __TS__InitErrorClass(
        class extends Error {
            public name = errorName;
        },
        errorName
    );
}
