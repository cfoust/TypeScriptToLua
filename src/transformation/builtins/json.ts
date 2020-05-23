//import * as ts from "typescript";
import * as lua from "../../LuaAST";
//import { LuaTarget } from "../../CompilerOptions";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
//import { PropertyCallExpression, transformArguments } from "../visitors/call";
import { PropertyCallExpression } from "../visitors/call";

export function transformJSONCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.Expression | undefined {
    const expression = node.expression;
    //const signature = context.checker.getResolvedSignature(node);
    //const params = transformArguments(context, node.arguments, signature);

    const expressionName = expression.name.text;
    switch (expressionName) {
        default:
            context.diagnostics.push(unsupportedProperty(expression.name, "JSON", expressionName));
    }

    return undefined;
}
