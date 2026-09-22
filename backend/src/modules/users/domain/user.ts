// SECRETARY is the front desk: books for every doctor, never opens a chart.
export enum Role { ADMIN='ADMIN', DOCTOR='DOCTOR', SECRETARY='SECRETARY' }
export class User { constructor(public readonly id:string, public email:string, public name:string='', public passwordHash:string, public role:Role, public active=true, public readonly createdAt=new Date(), public mustChangePassword=false){} toPublic(){return {id:this.id,email:this.email,name:this.name,role:this.role,active:this.active,createdAt:this.createdAt,mustChangePassword:this.mustChangePassword};} }
