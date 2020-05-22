import * as ts from "typescript";
import * as lua from "../../LuaAST";
import { FunctionVisitor } from "../context";
import { findScope, ScopeType } from "../utils/scope";
import { LuaTarget } from "../../CompilerOptions";

export const transformBreakStatement: FunctionVisitor<ts.BreakStatement> = (breakStatement, context) => {
    const breakableScope = findScope(context, ScopeType.Loop | ScopeType.Switch);
    if (breakableScope?.type === ScopeType.Switch) {
        if (context.luaTarget === LuaTarget.Lua51) {
          return lua.createAssignmentStatement(lua.createIdentifier(`____switch${breakableScope.id}_break`), lua.createBooleanLiteral(false));
        }

        return lua.createGotoStatement(`____switch${breakableScope.id}_end`);
    } else {
        return lua.createBreakStatement(breakStatement);
    }
};

export const transformContinueStatement: FunctionVisitor<ts.ContinueStatement> = (statement, context) => {
  const scope = findScope(context, ScopeType.Loop);

  if (scope) {
    scope.loopContinued = true;
  }

  const reference = `__continue${scope?.id ?? ""}`

  if (context.luaTarget === LuaTarget.Lua51) {
    return lua.createAssignmentStatement(lua.createIdentifier(reference), lua.createBooleanLiteral(false));
  }

  return lua.createGotoStatement(reference, statement);
};
