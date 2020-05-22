import * as ts from "typescript";
import { LuaTarget } from "../../CompilerOptions";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { performHoisting, popScope, pushScope, ScopeType } from "../utils/scope";
import { wrapStatements } from './loops/utils'

export const transformSwitchStatement: FunctionVisitor<ts.SwitchStatement> = (statement, context) => {

    const scope = pushScope(context, ScopeType.Switch);

    // Give the switch a unique name to prevent nested switches from acting up.
    const switchName = `____switch${scope.id}`;
    const switchVariable = lua.createIdentifier(switchName);

    let statements: lua.Statement[] = [];

    const caseClauses = statement.caseBlock.clauses.filter(ts.isCaseClause);

    if (context.luaTarget === LuaTarget.Lua51) {
      // Similar to loop continues, gotta prefix every statement with its break to make sure the switch hasn't
      // been broken
      const breakVariable = lua.createIdentifier(`${switchName}_break`);
      statements.unshift(lua.createVariableDeclarationStatement(breakVariable, lua.createBooleanLiteral(true)));
      const ifStatements: lua.Statement[] = caseClauses.map((clause) => {
        const condition = lua.createBinaryExpression(
          switchVariable,
          context.transformExpression(clause.expression),
          lua.SyntaxKind.EqualityOperator
        )

        return lua.createIfStatement(condition, lua.createBlock(context.transformStatements(clause.statements)));
      })

      // default case, comes at end
      for (const [, clause] of statement.caseBlock.clauses.entries()) {
        if (!ts.isDefaultClause(clause)) continue
        ifStatements.push(lua.createDoStatement(context.transformStatements(clause.statements)));
      }

      statements = statements.concat(wrapStatements(breakVariable, ifStatements));
    } else {
      // Starting from the back, concatenating ifs into one big if/elseif statement
      const concatenatedIf = caseClauses.reduceRight((previousCondition, clause, index) => {
        // If the clause condition holds, go to the correct label
        const condition = lua.createBinaryExpression(
          switchVariable,
          context.transformExpression(clause.expression),
          lua.SyntaxKind.EqualityOperator
        );

        const goto = lua.createGotoStatement(`${switchName}_case_${index}`);
        return lua.createIfStatement(condition, lua.createBlock([goto]), previousCondition);
      }, undefined as lua.IfStatement | undefined);

      if (concatenatedIf) {
        statements.push(concatenatedIf);
      }

      const hasDefaultCase = statement.caseBlock.clauses.some(ts.isDefaultClause);
      statements.push(lua.createGotoStatement(`${switchName}_${hasDefaultCase ? "case_default" : "end"}`));

      for (const [index, clause] of statement.caseBlock.clauses.entries()) {
        const labelName = `${switchName}_case_${ts.isCaseClause(clause) ? index : "default"}`;
        statements.push(lua.createLabelStatement(labelName));
        statements.push(lua.createDoStatement(context.transformStatements(clause.statements)));
      }

      statements.push(lua.createLabelStatement(`${switchName}_end`));
    }

    statements = performHoisting(context, statements);
    popScope(context);

    const expression = context.transformExpression(statement.expression);
    statements.unshift(lua.createVariableDeclarationStatement(switchVariable, expression));

    return statements;
};
