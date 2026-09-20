export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export class Prescription {
  constructor(
    public readonly id: string,
    public readonly appointmentId: string,
    public readonly doctorId: string,
    public readonly patientId: string,
    public medications: Medication[],
    public instructions: string | null,
    public readonly createdAt: Date = new Date(),
  ) {}

  toPublic() {
    return {
      id: this.id,
      appointmentId: this.appointmentId,
      doctorId: this.doctorId,
      patientId: this.patientId,
      medications: this.medications,
      instructions: this.instructions,
      createdAt: this.createdAt,
    };
  }
}
