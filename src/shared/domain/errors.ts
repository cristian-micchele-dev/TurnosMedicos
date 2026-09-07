export class DomainError extends Error { constructor(public readonly code:string, message:string, public readonly status=400){super(message);} }
export class UnauthorizedError extends DomainError { constructor(){super('UNAUTHORIZED','Credenciales inválidas',401);} }
export class ConflictError extends DomainError { constructor(message='El recurso ya existe'){super('CONFLICT',message,409);} }
export class ForbiddenError extends DomainError { constructor(){super('FORBIDDEN','No tiene permisos para esta operación',403);} }
