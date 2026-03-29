import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CertificateForPdf {
  certificateNumber: number;
  projectName: string;
  contractorName: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalAmount: number;
  approvedAt: string | null;
  notes: string | null;
  items: {
    categoryName: string;
    budgetItemName: string;
    unit: string;
    budgetedQuantity: number;
    progressPercent: number;
    unitPrice: number;
    previousQuantity: number;
    currentQuantity: number;
    accumulatedQuantity: number;
    currentAmount: number;
  }[];
}

function fmtCurrency(n: number): string {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  SUBMITTED: "Enviada",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

export function exportCertificatePdf(cert: CertificateForPdf) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`Certificación #${cert.certificateNumber}`, 14, 20);

  // Status badge
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Estado: ${STATUS_LABELS[cert.status] ?? cert.status}`, pageWidth - 14, 20, { align: "right" });

  // Info rows
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  let y = 28;
  doc.text(`Proyecto: ${cert.projectName}`, 14, y);
  doc.text(`Contratista: ${cert.contractorName}`, pageWidth / 2, y);
  y += 6;
  doc.text(`Período: ${fmtDate(cert.periodStart)} al ${fmtDate(cert.periodEnd)}`, 14, y);
  if (cert.approvedAt) {
    doc.text(`Aprobada: ${fmtDate(cert.approvedAt)}`, pageWidth / 2, y);
  }
  y += 4;

  if (cert.notes) {
    y += 4;
    doc.setFontSize(9);
    doc.text(`Notas: ${cert.notes}`, 14, y);
    y += 4;
  }

  // Line separator
  y += 2;
  doc.setDrawColor(200);
  doc.line(14, y, pageWidth - 14, y);
  y += 4;

  // Table
  autoTable(doc, {
    startY: y,
    head: [["Rubro", "Partida", "Unidad", "Cantidad", "Avance %", "P. Unit.", "Anterior", "Actual", "Acumulado", "Monto"]],
    body: cert.items.map((item) => [
      item.categoryName,
      item.budgetItemName,
      item.unit,
      String(item.budgetedQuantity),
      `${item.progressPercent}%`,
      fmtCurrency(item.unitPrice),
      String(item.previousQuantity),
      String(item.currentQuantity),
      String(item.accumulatedQuantity),
      fmtCurrency(item.currentAmount),
    ]),
    foot: [["", "", "", "", "", "", "", "", "TOTAL", fmtCurrency(cert.totalAmount)]],
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: "bold",
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: 30 },
      3: { halign: "right" },
      4: { halign: "center" },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
      8: { halign: "right" },
      9: { halign: "right" },
    },
    margin: { left: 14, right: 14 },
  });

  // Footer
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    `Generado el ${new Date().toLocaleDateString("es-AR")} — BuildControl`,
    14,
    finalY
  );

  // Save
  const filename = `Certificacion_${cert.certificateNumber}_${cert.contractorName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  doc.save(filename);
}
