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

export function wrapStatements(expression: lua.Expression, statements: lua.Statement[]): lua.Statement[] {
  let result = [] as lua.Statement[]
  for (const item of statements) {
    result = result.concat(wrapWithIf(expression, item))
  }
  return result
}

function wrapBlock(expression: lua.Expression, block: lua.Block): lua.Block {
  return lua.createBlock(wrapStatements(expression, block.statements))
}

function wrapWithIf(expression: lua.Expression, statement: lua.Statement): lua.Statement[] {
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

  if (statement.kind === lua.SyntaxKind.IfStatement) {
    const ifStatement = statement as lua.IfStatement
    const { ifBlock, elseBlock } = ifStatement

    const comparison = lua.createBinaryExpression(expression, ifStatement.condition, lua.SyntaxKind.AndOperator)
    const wrappedIf = wrapBlock(expression, ifBlock)

    if (elseBlock == null) {
      return [lua.createIfStatement(
        comparison,
        wrappedIf,
        undefined
      )]
    }

    if (elseBlock.kind === lua.SyntaxKind.Block) {
      return [lua.createIfStatement(
        comparison,
        wrappedIf,
        wrapBlock(expression, elseBlock),
      )]
    }

    if (elseBlock.kind === lua.SyntaxKind.IfStatement) {
      const [result] = wrapWithIf(expression, elseBlock)
      if (result.kind === lua.SyntaxKind.IfStatement) {
        const ifResult = result as lua.IfStatement
        return [lua.createIfStatement(
          comparison,
          wrappedIf,
          ifResult,
        )]
      }
    }
  }

  if (statement.kind === lua.SyntaxKind.DoStatement) {
    const doBlock = statement as lua.DoStatement
    return [
      lua.createDoStatement(wrapStatements(expression, doBlock.statements))
    ]
  }

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
      const baseResult: lua.Statement[] = [lua.createVariableDeclarationStatement(flag, lua.createBooleanLiteral(true))];
      return baseResult.concat(wrapStatements(flag, body))
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
