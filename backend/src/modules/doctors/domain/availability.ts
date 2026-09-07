export class Availability {
  constructor(
    public readonly id: string,
    public readonly doctorId: string,
    public dayOfWeek: number,
    public startTime: string,
    public endTime: string,
    public slotDurationMinutes: number = 30,
  ) {}

  toPublic() {
    return { id: this.id, doctorId: this.doctorId, dayOfWeek: this.dayOfWeek, startTime: this.startTime, endTime: this.endTime, slotDurationMinutes: this.slotDurationMinutes };
  }

  generateSlots(): string[] {
    const slots: string[] = [];
    const [startH, startM] = this.startTime.split(':').map(Number);
    const [endH, endM] = this.endTime.split(':').map(Number);
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;
    while (current + this.slotDurationMinutes <= end) {
      const h = String(Math.floor(current / 60)).padStart(2, '0');
      const m = String(current % 60).padStart(2, '0');
      slots.push(`${h}:${m}`);
      current += this.slotDurationMinutes;
    }
    return slots;
  }
}
