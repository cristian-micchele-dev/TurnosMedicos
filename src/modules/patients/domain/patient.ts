export class Patient {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public phone: string | null = null,
    public dateOfBirth: string | null = null,
    public address: string | null = null,
    public insuranceNumber: string | null = null,
    public active: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) {}

  toPublic() {
    return { id: this.id, userId: this.userId, phone: this.phone, dateOfBirth: this.dateOfBirth, address: this.address, insuranceNumber: this.insuranceNumber, active: this.active, createdAt: this.createdAt };
  }
}
