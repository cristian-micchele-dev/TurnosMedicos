export class MedicalReport {
  constructor(
    public readonly id: string,
    public readonly appointmentId: string | null,
    public readonly doctorId: string,
    public readonly patientId: string,
    public title: string,
    public description: string | null,
    public readonly fileName: string,
    public readonly originalName: string,
    public readonly mimeType: string,
    public readonly sizeBytes: number,
    public readonly createdAt: Date = new Date(),
  ) {}

  toPublic() {
    return {
      id: this.id,
      appointmentId: this.appointmentId,
      doctorId: this.doctorId,
      patientId: this.patientId,
      title: this.title,
      description: this.description,
      fileName: this.fileName,
      originalName: this.originalName,
      mimeType: this.mimeType,
      sizeBytes: this.sizeBytes,
      createdAt: this.createdAt,
    };
  }
}
