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
    // File name under uploads/avatars; null when the doctor has no photo yet.
    public avatarFile: string | null = null,
  ) { if (!licenseNumber?.trim()) throw new Error('licenseNumber no puede estar vacío'); }

  toPublic() {
    return {
      id: this.id, userId: this.userId, specialtyId: this.specialtyId,
      licenseNumber: this.licenseNumber, phone: this.phone, active: this.active,
      avatarFile: this.avatarFile, createdAt: this.createdAt, user: this.user, specialty: this.specialty,
    };
  }
}
