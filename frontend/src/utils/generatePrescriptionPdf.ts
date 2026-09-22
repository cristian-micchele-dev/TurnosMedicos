import { jsPDF } from 'jspdf';
import type { Prescription } from '../api/prescriptions';

interface PrescriptionPdfContext {
  prescription: Prescription;
  doctorName: string;
  doctorLicense: string;
  patientName: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNow(): string {
  return new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function generatePrescriptionPdf(ctx: PrescriptionPdfContext): void {
  const { prescription, doctorName, doctorLicense, patientName } = ctx;

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR;

  const accent: [number, number, number] = [56, 189, 248];
  const dark: [number, number, number] = [15, 23, 42];
  const secondary: [number, number, number] = [100, 116, 139];

  let y = 18;

  // ── Medical cross icon ──
  const crossX = marginL;
  const crossY = y - 4;
  const armW = 4;
  const armH = 12;
  doc.setFillColor(...accent);
  doc.rect(crossX + (armH - armW) / 2, crossY, armW, armH, 'F');
  doc.rect(crossX, crossY + (armH - armW) / 2, armH, armW, 'F');

  // ── Header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...accent);
  doc.text('Pulso', marginL + 16, y + 1);

  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(...secondary);
  doc.text('Receta Médica', marginL + 16, y);

  y += 10;

  // ── Accent banner ──
  doc.setFillColor(...accent);
  doc.roundedRect(marginL, y, contentW, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('RECETA MÉDICA DIGITAL', pageW / 2, y + 8, { align: 'center' });

  y += 18;

  // ── Separator ──
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, marginL + contentW, y);
  y += 8;

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

  // ── Row helper ──
  function drawRow(label: string, value: string): void {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...secondary);
    doc.text(label.toUpperCase(), marginL, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    doc.text(value || '—', marginL + 42, y);
    y += 9;
  }

  // ── Doctor info ──
  drawSectionHeader('Médico');
  drawRow('Doctor', doctorName);
  drawRow('Matrícula', doctorLicense);
  drawRow('Fecha', formatDate(prescription.createdAt));

  y += 2;

  // ── Patient info ──
  drawSectionHeader('Paciente');
  drawRow('Paciente', patientName);

  y += 2;

  // ── Medications table ──
  drawSectionHeader('Medicamentos');

  // Table header
  const colWidths = [60, 30, 45, 35];
  const colX = [marginL, marginL + 60, marginL + 90, marginL + 135];
  const headers = ['Medicamento', 'Dosis', 'Frecuencia', 'Duración'];

  doc.setFillColor(240, 249, 255);
  doc.rect(marginL, y - 4, contentW, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...accent);
  headers.forEach((h, i) => {
    doc.text(h, colX[i] + 2, y);
  });
  y += 6;

  doc.setDrawColor(...secondary);
  doc.setLineWidth(0.2);
  doc.line(marginL, y, marginL + contentW, y);
  y += 4;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...dark);

  prescription.medications.forEach((med, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginL, y - 3, contentW, 7, 'F');
    }

    const values = [med.name, med.dosage, med.frequency, med.duration];
    values.forEach((val, i) => {
      const truncated = doc.splitTextToSize(val, colWidths[i] - 4)[0] as string;
      doc.text(truncated, colX[i] + 2, y + 1);
    });
    y += 8;
  });

  y += 4;

  // ── Instructions ──
  if (prescription.instructions) {
    drawSectionHeader('Instrucciones');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(prescription.instructions, contentW) as string[];
    doc.text(lines, marginL, y);
    y += lines.length * 5 + 4;
  }

  // ── Footer ──
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

  doc.save(`receta-${prescription.id.slice(0, 8)}.pdf`);
}
