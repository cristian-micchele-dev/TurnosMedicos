export enum Role { ADMIN='ADMIN', DOCTOR='DOCTOR' }
export class User { constructor(public readonly id:string, public email:string, public name:string='', public passwordHash:string, public role:Role, public active=true, public readonly createdAt=new Date()){} toPublic(){return {id:this.id,email:this.email,name:this.name,role:this.role,active:this.active,createdAt:this.createdAt};} }
