export class Specialty {
  constructor(
    public readonly id: string,
    public name: string,
    public description: string | null = null,
    public active: boolean = true,
    public readonly createdAt: Date = new Date(),
  ) {}

  public toPublic() {
    return { id: this.id, name: this.name, description: this.description, active: this.active, createdAt: this.createdAt };
  }
}
