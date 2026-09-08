export class Doctor {
  user?: { id: string; email: string; name: string };
  specialty?: { id: string; name: string };

  constructor(
    public readonly id: string,
    public readonly userId: string,
    public specialtyId: string,
    public licenseNumber: string,
    public phone: string | null = null,
    public active: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) { if (!licenseNumber?.trim()) throw new Error('licenseNumber no puede estar vacío'); }

  toPublic() {
    return {
      id: this.id, userId: this.userId, specialtyId: this.specialtyId,
      licenseNumber: this.licenseNumber, phone: this.phone, active: this.active,
      createdAt: this.createdAt, user: this.user, specialty: this.specialty,
    };
  }
}
