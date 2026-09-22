import { jsPDF } from 'jspdf';
import type { Appointment, AppointmentStatus } from '../api/appointments';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function formatNow(): string {
  return new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function generateAppointmentPdf(appointment: Appointment): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;

  // ── Accent color (cyan #38bdf8 → RGB 56,189,248) ──
  const accent: [number, number, number] = [56, 189, 248];
  // ── Dark text (#0f172a → RGB 15,23,42) ──
  const dark: [number, number, number] = [15, 23, 42];
  // ── Secondary text ──
  const secondary: [number, number, number] = [100, 116, 139];

  let y = 18;

  // ── Medical cross icon (drawn with shapes) ──
  const crossX = marginL;
  const crossY = y - 4;
  const armW = 4;
  const armH = 12;
  doc.setFillColor(...accent);
  // Vertical bar
  doc.rect(crossX + (armH - armW) / 2, crossY, armW, armH, 'F');
  // Horizontal bar
  doc.rect(crossX, crossY + (armH - armW) / 2, armH, armW, 'F');

  // ── Title ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...accent);
  doc.text('Pulso', marginL + 16, y + 1);

  y += 8;

  // ── Subtitle ──
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...secondary);
  doc.text('Comprobante de Turno', marginL + 16, y);

  y += 10;

  // ── Appointment code ──
  doc.setFillColor(...accent);
  doc.roundedRect(marginL, y, contentW, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(appointment.code, pageW / 2, y + 8, { align: 'center' });

  y += 18;

  // ── Separator ──
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, marginL + contentW, y);

  y += 8;

  // ── Info rows helper ──
  const rowHeight = 9;

  function drawRow(label: string, value: string): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...secondary);
    doc.text(label.toUpperCase(), marginL, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(value || '—', marginL + 42, y);

    y += rowHeight;
  }

  // ── Section header helper ──
  function drawSectionHeader(title: string): void {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...accent);
    doc.text(title.toUpperCase(), marginL, y);
    y += 3;
    doc.setDrawColor(...accent);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, marginL + contentW, y);
    y += 6;
  }

  // ── Appointment details section ──
  drawSectionHeader('Datos del Turno');
  drawRow('Fecha', formatDate(appointment.dateTime));
  drawRow('Hora', formatTime(appointment.dateTime));
  drawRow('Duración', `${appointment.durationMinutes} minutos`);
  drawRow('Estado', STATUS_LABELS[appointment.status] ?? appointment.status);

  y += 2;
  drawSectionHeader('Médico');
  drawRow('Doctor', appointment.doctor?.user?.name ?? '—');
  drawRow('Especialidad', appointment.doctor?.specialty?.name ?? '—');
  drawRow('Matrícula', appointment.doctor?.licenseNumber ?? '—');

  y += 2;
  drawSectionHeader('Paciente');
  drawRow('Paciente', appointment.patient?.name ?? '—');

  // ── Diagnosis (optional) ──
  if (appointment.diagnosis) {
    y += 2;
    drawSectionHeader('Diagnóstico');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(appointment.diagnosis, contentW);
    doc.text(lines, marginL, y);
    y += lines.length * 5 + 4;
  }

  // ── Notes (optional) ──
  if (appointment.notes) {
    y += 2;
    drawSectionHeader('Observaciones');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(appointment.notes, contentW);
    doc.text(lines, marginL, y);
    y += lines.length * 5 + 4;
  }

  // ── Footer ──
  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(...secondary);
  doc.setLineWidth(0.3);
  doc.line(marginL, pageH - 16, marginL + contentW, pageH - 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...secondary);
  doc.text(
    `Generado el ${formatNow()} — Pulso`,
    pageW / 2,
    pageH - 10,
    { align: 'center' },
  );

  doc.save(`turno-${appointment.code}.pdf`);
}
