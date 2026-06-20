import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COMPANY } from './company.js';

// Bon d'achat / Bon de réception — pour les achats matières premières.
// Param `withTVA`: si true, montre Total HT + TVA + Total TTC.
//                 si false (ou tvaRate = 0), montre seulement le Total HT.
export function generatePurchaseBonPDF(purchase, { withTVA = false } = {}) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 18;

  // === EN-TÊTE: branding centré ===
  doc.setFontSize(22).setFont('helvetica', 'bold').setTextColor(40);
  doc.text(COMPANY.name, w / 2, y, { align: 'center' });
  y += 6;
  if (COMPANY.tagline) {
    doc.setFontSize(10).setFont('helvetica', 'italic').setTextColor(80);
    doc.text(COMPANY.tagline, w / 2, y, { align: 'center' });
    y += 6;
  }
  doc.setDrawColor(180);
  doc.setLineWidth(0.4);
  doc.line(14, y, w - 14, y);
  y += 8;

  // === BLOC DEUX COLONNES (info officielle à gauche, titre + meta à droite) ===
  // Titre à droite (sous le séparateur, plus de risque d'overlap avec le tagline)
  doc.setTextColor(34, 139, 34);
  doc.setFontSize(20).setFont('helvetica', 'bold');
  doc.text(withTVA ? "BON D'ACHAT (TVA)" : "BON D'ACHAT", w - 14, y, { align: 'right' });
  // Méta à droite sous le titre
  doc.setTextColor(60);
  doc.setFontSize(10).setFont('helvetica', 'normal');
  const date = new Date(purchase.createdAt).toLocaleDateString('fr-FR');
  doc.text(`N° : ${purchase.invoiceNo}`, w - 14, y + 7, { align: 'right' });
  doc.text(`Date : ${date}`, w - 14, y + 12, { align: 'right' });
  doc.text(`Statut : ${purchase.status}`, w - 14, y + 17, { align: 'right' });
  const rightEnd = y + 17;

  // Info officielle à gauche, parallèle au titre
  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(40);
  const officialLines = [
    COMPANY.addressLine1,
    COMPANY.addressLine2,
    COMPANY.phone ? `N° tél : ${COMPANY.phone}` : null,
    COMPANY.rc,
    COMPANY.nif,
    COMPANY.ai,
  ].filter(Boolean);
  let leftY = y + 5;
  for (const line of officialLines) {
    doc.text(line, 14, leftY);
    leftY += 4.5;
  }

  y = Math.max(leftY, rightEnd) + 4;
  doc.setDrawColor(220);
  doc.line(14, y, w - 14, y);
  y += 7;

  // Bloc fournisseur
  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(34, 139, 34);
  doc.text('FOURNISSEUR', 14, y); y += 5;
  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(40);
  if (purchase.supplier) {
    doc.setFont('helvetica', 'bold');
    doc.text(purchase.supplier.name, 14, y); y += 4.5;
    doc.setFont('helvetica', 'normal');
    if (purchase.supplier.phone)   { doc.text(`Tél : ${purchase.supplier.phone}`, 14, y); y += 4.5; }
    if (purchase.supplier.email)   { doc.text(`Email : ${purchase.supplier.email}`, 14, y); y += 4.5; }
    if (purchase.supplier.address) { doc.text(purchase.supplier.address, 14, y); y += 4.5; }
  } else {
    doc.setTextColor(120);
    doc.text('Fournisseur de passage', 14, y); y += 4.5;
    doc.setTextColor(40);
  }
  y += 4;

  // Articles
  const rows = purchase.items.map((it, idx) => [
    String(idx + 1),
    it.material?.name || `Matière #${it.materialId}`,
    it.material?.category || '—',
    `${it.quantity} ${it.material?.unit || ''}`,
    `${it.unitPrice.toFixed(2)} ${COMPANY.currency}`,
    `${it.subtotal.toFixed(2)} ${COMPANY.currency}`,
  ]);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Matière première', 'Catégorie', 'Quantité', 'P.U. HT', 'Montant HT']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // Totaux
  let fy = doc.lastAutoTable.finalY + 8;
  const totalHT = purchase.total;
  const tvaRate = purchase.tvaRate || 0;
  const totalTVA = withTVA && tvaRate > 0 ? totalHT * (tvaRate / 100) : 0;
  const totalTTC = totalHT + totalTVA;

  const labelX = w - 75;
  const valX = w - 14;
  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(40);

  if (withTVA && tvaRate > 0) {
    doc.text('Total HT :', labelX, fy);
    doc.text(`${totalHT.toFixed(2)} ${COMPANY.currency}`, valX, fy, { align: 'right' });
    fy += 5;
    doc.text(`TVA (${tvaRate}%) :`, labelX, fy);
    doc.text(`${totalTVA.toFixed(2)} ${COMPANY.currency}`, valX, fy, { align: 'right' });
    fy += 5;
    doc.setFontSize(13).setFont('helvetica', 'bold');
    doc.setFillColor(34, 139, 34);
    doc.rect(labelX - 6, fy - 4, 73, 8, 'F');
    doc.setTextColor(255);
    doc.text('TOTAL TTC :', labelX, fy + 1.5);
    doc.text(`${totalTTC.toFixed(2)} ${COMPANY.currency}`, valX, fy + 1.5, { align: 'right' });
  } else {
    doc.setFontSize(13).setFont('helvetica', 'bold');
    doc.text('TOTAL :', labelX, fy);
    doc.setTextColor(34, 139, 34);
    doc.setFontSize(15);
    doc.text(`${totalHT.toFixed(2)} ${COMPANY.currency}`, valX, fy, { align: 'right' });
  }

  if (purchase.notes) {
    doc.setTextColor(80).setFont('helvetica', 'italic').setFontSize(9);
    doc.text(`Notes : ${purchase.notes}`, 14, doc.lastAutoTable.finalY + 12);
  }

  const pageH = doc.internal.pageSize.getHeight();
  doc.setDrawColor(220);
  doc.line(14, pageH - 18, w - 14, pageH - 18);
  doc.setFontSize(8).setTextColor(120);
  doc.text(COMPANY.name, w / 2, pageH - 12, { align: 'center' });
  doc.text('Document interne — Réception matières premières', w / 2, pageH - 8, { align: 'center' });

  const suffix = withTVA ? '_TVA' : '';
  doc.save(`${purchase.invoiceNo}${suffix}.pdf`);
}
