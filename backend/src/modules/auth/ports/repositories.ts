export interface AuthSession {id:string; userId:string; familyId:string; tokenHash:string; jti:string; expiresAt:Date; revokedAt?:Date; replacedBy?:string}
export interface SessionRepository {save(s:AuthSession):Promise<void>; findByJti(jti:string):Promise<AuthSession|undefined>; rotate(id:string,tokenHash:string,replacedBy:string,now:Date):Promise<boolean>; revoke(id:string,replacedBy?:string):Promise<void>; revokeFamily(familyId:string):Promise<void>; revokeAllForUser(userId:string):Promise<void>}
export interface ResetToken {id:string;userId:string;tokenHash:string;expiresAt:Date;usedAt?:Date}
export interface ResetRepository {save(t:ResetToken):Promise<void>; consume(hash:string,now:Date):Promise<ResetToken|undefined>}
export interface MailerPort {sendPasswordReset(email:string,token:string):Promise<void>}
export const SESSION_REPOSITORY=Symbol('SESSION_REPOSITORY'); export const RESET_REPOSITORY=Symbol('RESET_REPOSITORY'); export const MAILER=Symbol('MAILER');
