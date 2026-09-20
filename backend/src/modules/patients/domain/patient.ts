export class Patient {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string | null = null,
    public phone: string | null = null,
    public dateOfBirth: string | null = null,
    public address: string | null = null,
    public insuranceNumber: string | null = null,
    public notes: string | null = null,
    public active: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) {}

  toPublic() {
    return {
      id: this.id, name: this.name, email: this.email, phone: this.phone, dateOfBirth: this.dateOfBirth,
      address: this.address, insuranceNumber: this.insuranceNumber, notes: this.notes, active: this.active,
      createdAt: this.createdAt,
    };
  }
}
