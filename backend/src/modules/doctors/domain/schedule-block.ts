export class ScheduleBlock {
  constructor(
    public id: string,
    public doctorId: string,
    public startDate: Date,
    public endDate: Date,
    public reason: string | null,
    public createdAt: Date,
  ) {}

  toPublic() {
    return {
      id: this.id,
      doctorId: this.doctorId,
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
      reason: this.reason,
      createdAt: this.createdAt.toISOString(),
    };
  }
}
