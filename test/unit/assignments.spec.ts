import { unsupportedVarDeclaration } from "../../src/transformation/utils/diagnostics";
import * as util from "../util";

test.each(["const", "let"])("%s declaration not top-level is not global", declarationKind => {
    util.testModule`
        {
            ${declarationKind} foo = true;
        }
        // @ts-ignore
        return "foo" in globalThis;
    `.expectToEqual(false);
});

test.each(["const", "let"])("top-level %s declaration is global", declarationKind => {
    util.testBundle`
        import './a';
        export const result = foo;
    `
        .addExtraFile("a.ts", `${declarationKind} foo = true;`)
        .expectToEqual({ result: true });
});

describe("var is disallowed", () => {
    test("var declaration", () => {
        util.testFunction`
            var foo = true;
        `.expectDiagnosticsToMatchSnapshot([unsupportedVarDeclaration.code]);
    });

    test("for loop", () => {
        util.testFunction`
            for (var foo = 0;;) {}
        `.expectDiagnosticsToMatchSnapshot([unsupportedVarDeclaration.code]);
    });

    test("for...in loop", () => {
        util.testFunction`
            for (var foo in {}) {}
        `.expectDiagnosticsToMatchSnapshot([unsupportedVarDeclaration.code]);
    });

    test("for...of loop", () => {
        util.testFunction`
            for (var foo of []) {}
        `.expectDiagnosticsToMatchSnapshot([unsupportedVarDeclaration.code]);
    });
});

test.each(["let result;", "const result = null;", "const result = undefined;"])(
    "Null assignments (%p)",
    declaration => {
        util.testFunction`
            ${declaration}
            return result;
        `.expectToEqual(undefined);
    }
);

test.each(["x = y", "x += y"])("Assignment expressions (%p)", expression => {
    util.testFunction`
        let x = "x";
        let y = "y";
        return ${expression};
    `.expectToMatchJsResult();
});

test.each(["x = o.p", "x = a[0]", "x = y = o.p", "x = o.p"])("Assignment expressions using temp (%p)", expression => {
    util.testFunction`
        let x = "x";
        let y = "y";
        let o = {p: "o"};
        let a = ["a"];
        return ${expression};
    `.expectToMatchJsResult();
});

test.each(["o.p = x", "a[0] = x", "o.p = a[0]", "o.p = a[0] = x"])(
    "Property assignment expressions (%p)",
    expression => {
        util.testFunction`
            let x = "x";
            let o = {p: "o"};
            let a = ["a"];
            return ${expression};
        `.expectToMatchJsResult();
    }
);

test.each([
    "x = t()",
    "x = tr()",
    "[x[1], x[0]] = t()",
    "[x[1], x[0]] = tr()",
    "x = [y[1], y[0]]",
    "[x[0], x[1]] = [y[1], y[0]]",
])("Tuple assignment expressions (%p)", expression => {
    util.testFunction`
        let x: [string, string] = ["x0", "x1"];
        let y: [string, string] = ["y0", "y1"];
        function t(): [string, string] { return ["t0", "t1"] };
        /** @tupleReturn */
        function tr(): [string, string] { return ["tr0", "tr1"] };
        const r = ${expression};
        return \`\${r[0]},\${r[1]}\`
    `.expectToMatchJsResult();
});

test.each([
    "++x",
    "x++",
    "--x",
    "x--",
    "x += y",
    "x -= y",
    "x *= y",
    "y /= x",
    "y %= x",
    "y **= x",
    "x |= y",
    "x &= y",
    "x ^= y",
    "x <<= y",
    "x >>>= y",
])("Operator assignment statements (%p)", statement => {
    util.testFunction`
        let x = 3;
        let y = 6;
        ${statement};
        return { x, y };
    `.expectToMatchJsResult();
});

test.each([
    "++o.p",
    "o.p++",
    "--o.p",
    "o.p--",
    "o.p += a[0]",
    "o.p -= a[0]",
    "o.p *= a[0]",
    "a[0] /= o.p",
    "a[0] %= o.p",
    "a[0] **= o.p",
    "o.p |= a[0]",
    "o.p &= a[0]",
    "o.p ^= a[0]",
    "o.p <<= a[0]",
    "o.p >>>= a[0]",
])("Operator assignment to simple property statements (%p)", statement => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        ${statement};
        return { o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++o.p.d",
    "o.p.d++",
    "--o.p.d",
    "o.p.d--",
    "o.p.d += a[0][0]",
    "o.p.d -= a[0][0]",
    "o.p.d *= a[0][0]",
    "a[0][0] /= o.p.d",
    "a[0][0] %= o.p.d",
    "a[0][0] **= o.p.d",
    "o.p.d |= a[0][0]",
    "o.p.d &= a[0][0]",
    "o.p.d ^= a[0][0]",
    "o.p.d <<= a[0][0]",
    "o.p.d >>>= a[0][0]",
])("Operator assignment to deep property statements (%p)", statement => {
    util.testFunction`
        let o = { p: { d: 3 } };
        let a = [[6,11], [7,13]];
        ${statement};
        return { o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++of().p",
    "of().p++",
    "--of().p",
    "of().p--",
    "of().p += af()[i()]",
    "of().p -= af()[i()]",
    "of().p *= af()[i()]",
    "af()[i()] /= of().p",
    "af()[i()] %= of().p",
    "af()[i()] **= of().p",
    "of().p |= af()[i()]",
    "of().p &= af()[i()]",
    "of().p ^= af()[i()]",
    "of().p <<= af()[i()]",
    "of().p >>>= af()[i()]",
])("Operator assignment to complex property statements (%p)", statement => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        function of() { return o; }
        function af() { return a; }
        function i() { return 0; }
        ${statement};
        return { o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++of().p.d",
    "of().p.d++",
    "--of().p.d",
    "of().p.d--",
    "of().p.d += af()[i()][i()]",
    "of().p.d -= af()[i()][i()]",
    "of().p.d *= af()[i()][i()]",
    "af()[i()][i()] /= of().p.d",
    "af()[i()][i()] %= of().p.d",
    "af()[i()][i()] **= of().p.d",
    "of().p.d |= af()[i()][i()]",
    "of().p.d &= af()[i()][i()]",
    "of().p.d ^= af()[i()][i()]",
    "of().p.d <<= af()[i()][i()]",
    "of().p.d >>>= af()[i()][i()]",
])("Operator assignment to complex deep property statements (%p)", statement => {
    util.testFunction`
        let o = { p: { d: 3 } };
        let a = [[7, 6], [11, 13]];
        function of() { return o; }
        function af() { return a; }
        let _i = 0;
        function i() { return _i++; }
        ${statement};
        return { o, a, _i };
    `.expectToMatchJsResult();
});

test.each([
    "++x",
    "x++",
    "--x",
    "x--",
    "x += y",
    "x -= y",
    "x *= y",
    "y /= x",
    "y %= x",
    "y **= x",
    "x |= y",
    "x &= y",
    "x ^= y",
    "x <<= y",
    "x >>>= y",
    "x + (y += 7)",
    "x + (y += 7)",
    "x++ + (y += 7)",
])("Operator assignment expressions (%p)", expression => {
    util.testFunction`
        let x = 3;
        let y = 6;
        const r = ${expression};
        return { r, x, y };
    `.expectToMatchJsResult();
});

test.each([
    "++o.p",
    "o.p++",
    "--o.p",
    "o.p--",
    "o.p += a[0]",
    "o.p -= a[0]",
    "o.p *= a[0]",
    "a[0] /= o.p",
    "a[0] %= o.p",
    "a[0] **= o.p",
    "o.p |= a[0]",
    "o.p &= a[0]",
    "o.p ^= a[0]",
    "o.p <<= a[0]",
    "o.p >>>= a[0]",
    "o.p + (a[0] += 7)",
    "o.p += (a[0] += 7)",
    "o.p++ + (a[0] += 7)",
])("Operator assignment to simple property expressions (%p)", expression => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        const r = ${expression};
        return { r, o, a };
    `.expectToMatchJsResult();
});

test.each([
    "++of().p",
    "of().p++",
    "--of().p",
    "of().p--",
    "of().p += af()[i()]",
    "of().p -= af()[i()]",
    "of().p *= af()[i()]",
    "af()[i()] /= of().p",
    "af()[i()] %= of().p",
    "af()[i()] **= of().p",
    "of().p |= af()[i()]",
    "of().p &= af()[i()]",
    "of().p ^= af()[i()]",
    "of().p <<= af()[i()]",
    "of().p >>>= af()[i()]",
    "of().p + (af()[i()] += 7)",
    "of().p += (af()[i()] += 7)",
    "of().p++ + (af()[i()] += 7)",
])("Operator assignment to complex property expressions (%p)", expression => {
    util.testFunction`
        let o = { p: 3 };
        let a = [6];
        function of() { return o; }
        function af() { return a; }
        function i() { return 0; }
        const r = ${expression};
        return { r, o, a };
    `.expectToMatchJsResult();
});
