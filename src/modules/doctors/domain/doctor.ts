export class Doctor {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public specialtyId: string,
    public licenseNumber: string,
    public phone: string | null = null,
    public active: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) {}

  toPublic() {
    return { id: this.id, userId: this.userId, specialtyId: this.specialtyId, licenseNumber: this.licenseNumber, phone: this.phone, active: this.active, createdAt: this.createdAt };
  }
}
