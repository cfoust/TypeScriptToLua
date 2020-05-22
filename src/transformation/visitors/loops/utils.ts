import * as ts from "typescript";
import * as lua from "../../../LuaAST";
import { TransformationContext } from "../../context";
import { performHoisting, popScope, pushScope, ScopeType } from "../../utils/scope";
import { isAssignmentPattern } from "../../utils/typescript";
import { transformAssignment } from "../binary-expression/assignments";
import { transformAssignmentPattern } from "../binary-expression/destructuring-assignments";
import { transformBlockOrStatement } from "../block";
import { transformIdentifier } from "../identifier";
import { checkVariableDeclarationList, transformBindingPattern } from "../variable-declaration";
import { LuaTarget } from "../../../CompilerOptions";
//import { unsupportedForTarget } from "../../utils/diagnostics";

function wrapWithIf(expression: lua.Identifier, statement: lua.Statement): lua.Statement[] {
  // Still want variables to be around in the scope they originated in
  if (statement.kind === lua.SyntaxKind.VariableDeclarationStatement) {
    const declaration = statement as lua.VariableDeclarationStatement
    return [
      lua.createVariableDeclarationStatement(declaration.left),
      lua.createIfStatement(
        expression,
        lua.createBlock([
          lua.createAssignmentStatement(declaration.left, declaration.right)
        ])
      )
    ]
  }

  //if (statement.kind === lua.SyntaxKind.Block) {
    //const block = statement as lua.Block
    //const result = 
  //}

  return [lua.createIfStatement(
    expression,
    lua.createBlock([statement])
  )]
}

export function transformLoopBody(
    context: TransformationContext,
    loop: ts.WhileStatement | ts.DoStatement | ts.ForStatement | ts.ForOfStatement | ts.ForInOrOfStatement
): lua.Statement[] {
    pushScope(context, ScopeType.Loop);
    const body = performHoisting(context, transformBlockOrStatement(context, loop.statement));
    const scope = popScope(context);
    const scopeId = scope.id;

    if (!scope.loopContinued) {
        return body;
    }

    const reference = `__continue${scopeId}`

    // Janky way of doing this in 5.1. Just check the value of a variable before every statement.
    if (context.luaTarget === LuaTarget.Lua51) {
      const flag = lua.createIdentifier(reference)
      scope.continueFlag = flag
      let baseResult: lua.Statement[] = [lua.createVariableDeclarationStatement(flag, lua.createBooleanLiteral(true))];
      // Wrap every statement in an if check
      for (const statement of body) {
         baseResult = baseResult.concat(wrapWithIf(flag, statement))
      }
      return baseResult
    }

    const baseResult: lua.Statement[] = [lua.createDoStatement(body)];
    const continueLabel = lua.createLabelStatement(reference);
    baseResult.push(continueLabel);

    return baseResult;
}

export function getVariableDeclarationBinding(
    context: TransformationContext,
    node: ts.VariableDeclarationList
): ts.BindingName {
    checkVariableDeclarationList(context, node);

    if (node.declarations.length === 0) {
        return ts.createIdentifier("____");
    }

    return node.declarations[0].name;
}

export function transformForInitializer(
    context: TransformationContext,
    initializer: ts.ForInitializer,
    block: lua.Block
): lua.Identifier {
    const valueVariable = lua.createIdentifier("____value");

    if (ts.isVariableDeclarationList(initializer)) {
        // Declaration of new variable

        const binding = getVariableDeclarationBinding(context, initializer);
        if (ts.isArrayBindingPattern(binding) || ts.isObjectBindingPattern(binding)) {
            block.statements.unshift(...transformBindingPattern(context, binding, valueVariable));
        } else {
            // Single variable declared in for loop
            return transformIdentifier(context, binding);
        }
    } else {
        // Assignment to existing variable(s)

        block.statements.unshift(
            ...(isAssignmentPattern(initializer)
                ? transformAssignmentPattern(context, initializer, valueVariable)
                : transformAssignment(context, initializer, valueVariable))
        );
    }

    return valueVariable;
}
