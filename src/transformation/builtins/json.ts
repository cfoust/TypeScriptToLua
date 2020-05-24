import * as lua from "../../LuaAST";
import { TransformationContext } from "../context";
import { unsupportedProperty } from "../utils/diagnostics";
import { PropertyCallExpression, transformArguments } from "../visitors/call";

export function transformJSONCall(
    context: TransformationContext,
    node: PropertyCallExpression
): lua.Expression | undefined {
    const expression = node.expression;
    const signature = context.checker.getResolvedSignature(node);
    const params = transformArguments(context, node.arguments, signature);

    const expressionName = expression.name.text;
    const json = lua.createIdentifier("__TS__JSON");
    switch (expressionName) {
        case "stringify":
            return lua.createCallExpression(
                lua.createTableIndexExpression(json, lua.createStringLiteral("encode")),
                params,
                node
            );
        case "parse":
            return lua.createCallExpression(
                lua.createTableIndexExpression(json, lua.createStringLiteral("decode")),
                params,
                node
            );
        default:
            context.diagnostics.push(unsupportedProperty(expression.name, "JSON", expressionName));
    }

    return undefined;
}
