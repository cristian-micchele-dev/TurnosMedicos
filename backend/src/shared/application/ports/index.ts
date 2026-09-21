export interface Clock { now(): Date }
export interface Hasher { hash(value:string):Promise<string>; verify(hash:string,value:string):Promise<boolean> }
export interface TokenService { signAccess(payload:Record<string,unknown>):string; signRefresh(payload:Record<string,unknown>,ttlMs?:number):string; verifyAccess(token:string):Record<string,unknown>; verifyRefresh(token:string):Record<string,unknown>; refreshTtlMs?():number; rememberTtlMs?():number }
export const CLOCK=Symbol('CLOCK'); export const HASHER=Symbol('HASHER'); export const TOKEN_SERVICE=Symbol('TOKEN_SERVICE'); export const USER_REPOSITORY=Symbol('USER_REPOSITORY'); export const SESSION_REPOSITORY=Symbol('SESSION_REPOSITORY'); export const RESET_REPOSITORY=Symbol('RESET_REPOSITORY'); export const MAILER=Symbol('MAILER');
