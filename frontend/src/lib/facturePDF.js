import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COMPANY } from './company.js';

// FACTURE — version comptable détaillée: HT, Remise, TVA, Versé, Reste à payer
export function generateFacturePDF(saleRaw) {
  const sale = {
    invoiceNo:    saleRaw?.invoiceNo || '—',
    createdAt:    saleRaw?.createdAt || new Date().toISOString(),
    status:       saleRaw?.status || 'PAID',
    customer:     saleRaw?.customer || null,
    items:        Array.isArray(saleRaw?.items) ? saleRaw.items : [],
    total:        Number(saleRaw?.total) || 0,
    tvaRate:      Number(saleRaw?.tvaRate) || 0,
    remiseHT:     Number(saleRaw?.remiseHT) || 0,
    montantVerse: Number(saleRaw?.montantVerse) || 0,
    notes:        saleRaw?.notes || '',
  };

  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  let y = 18;

  // === BRANDING centré ===
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

  // === BLOC DEUX COLONNES ===
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(20).setFont('helvetica', 'bold');
  doc.text("FACTURE", w - 14, y, { align: 'right' });
  doc.setTextColor(60);
  doc.setFontSize(10).setFont('helvetica', 'normal');
  const date = new Date(sale.createdAt).toLocaleDateString('fr-FR');
  doc.text(`N° : ${sale.invoiceNo}`, w - 14, y + 7, { align: 'right' });
  doc.text(`Date : ${date}`, w - 14, y + 12, { align: 'right' });
  doc.text(`Statut : ${sale.status}`, w - 14, y + 17, { align: 'right' });
  const rightEnd = y + 17;

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

  // Bloc client
  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(14, 165, 233);
  doc.text('CLIENT', 14, y); y += 5;
  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(40);
  if (sale.customer) {
    doc.setFont('helvetica', 'bold');
    doc.text(sale.customer.name, 14, y); y += 4.5;
    doc.setFont('helvetica', 'normal');
    if (sale.customer.rc)          { doc.text(`RC N° : ${sale.customer.rc}`, 14, y); y += 4.5; }
    if (sale.customer.nif)         { doc.text(`NIF : ${sale.customer.nif}`, 14, y); y += 4.5; }
    if (sale.customer.siegeSocial) { doc.text(`Siège social : ${sale.customer.siegeSocial}`, 14, y); y += 4.5; }
    if (sale.customer.address)     { doc.text(sale.customer.address, 14, y); y += 4.5; }
    if (sale.customer.phone)       { doc.text(`Tél : ${sale.customer.phone}`, 14, y); y += 4.5; }
  } else {
    doc.setTextColor(120);
    doc.text('Client de passage', 14, y); y += 4.5;
    doc.setTextColor(40);
  }
  y += 4;

  // Articles
  const rows = sale.items.map((it, idx) => [
    String(idx + 1),
    it.product?.name || `Produit #${it.productId || ''}`,
    it.product?.sku || '—',
    String(it.quantity || 0),
    `${(Number(it.unitPrice) || 0).toFixed(2)}`,
    `${(Number(it.subtotal) || 0).toFixed(2)}`,
  ]);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Désignation', 'Réf.', 'Qté', `P.U. HT (${COMPANY.currency})`, `Montant HT (${COMPANY.currency})`]],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // === RÉCAP COMPTABLE ===
  const sumSubtotals = sale.items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
  const remiseHT = sale.remiseHT;
  const totalHT = Math.max(0, sumSubtotals - remiseHT);
  const tvaRate = sale.tvaRate;
  const totalTVA = totalHT * (tvaRate / 100);
  const totalTTC = totalHT + totalTVA;
  const verse = sale.montantVerse;
  const reste = totalTTC - verse;

  let fy = doc.lastAutoTable.finalY + 8;
  const labelX = w - 75;
  const valX = w - 14;

  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(40);

  // Cadre des totaux
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.rect(labelX - 6, fy - 5, 73, tvaRate > 0 ? 50 : (verse > 0 ? 32 : 16));

  doc.text('Sous-total HT :', labelX, fy);
  doc.text(`${sumSubtotals.toFixed(2)} ${COMPANY.currency}`, valX, fy, { align: 'right' });
  fy += 5;

  if (remiseHT > 0) {
    doc.setTextColor(14, 165, 233);
    doc.text('Remise HT :', labelX, fy);
    doc.text(`- ${remiseHT.toFixed(2)} ${COMPANY.currency}`, valX, fy, { align: 'right' });
    doc.setTextColor(40);
    fy += 5;
  }

  doc.setFont('helvetica', 'bold');
  doc.text('Total HT :', labelX, fy);
  doc.text(`${totalHT.toFixed(2)} ${COMPANY.currency}`, valX, fy, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  fy += 5;

  if (tvaRate > 0) {
    doc.text(`TVA (${tvaRate}%) :`, labelX, fy);
    doc.text(`${totalTVA.toFixed(2)} ${COMPANY.currency}`, valX, fy, { align: 'right' });
    fy += 5;
  }

  // Total TTC en évidence
  doc.setFillColor(14, 165, 233);
  doc.rect(labelX - 6, fy - 4, 73, 8, 'F');
  doc.setTextColor(255);
  doc.setFontSize(11).setFont('helvetica', 'bold');
  doc.text('TOTAL TTC :', labelX, fy + 1.5);
  doc.text(`${totalTTC.toFixed(2)} ${COMPANY.currency}`, valX, fy + 1.5, { align: 'right' });
  fy += 10;

  doc.setTextColor(40).setFontSize(10).setFont('helvetica', 'normal');

  if (verse > 0 || reste !== totalTTC) {
    doc.text('Montant déjà versé :', labelX, fy);
    doc.text(`${verse.toFixed(2)} ${COMPANY.currency}`, valX, fy, { align: 'right' });
    fy += 5;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(reste > 0 ? 180 : 34, reste > 0 ? 60 : 139, reste > 0 ? 60 : 34);
    doc.text('Reste à payer :', labelX, fy);
    doc.text(`${reste.toFixed(2)} ${COMPANY.currency}`, valX, fy, { align: 'right' });
    fy += 5;
  }

  // Notes
  doc.setTextColor(80).setFont('helvetica', 'italic').setFontSize(9);
  if (sale.notes) {
    doc.text(`Notes : ${sale.notes}`, 14, doc.lastAutoTable.finalY + 12);
  }

  // Footer
  const pageH = doc.internal.pageSize.getHeight();
  const sigY = pageH - 35;
  doc.setDrawColor(160).setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
  doc.text('Signature & cachet (Vendeur)', 30, sigY);
  doc.line(20, sigY + 12, 90, sigY + 12);
  doc.text('Signature & cachet (Client)', w - 90, sigY);
  doc.line(w - 100, sigY + 12, w - 30, sigY + 12);

  doc.setFontSize(8).setTextColor(120);
  doc.text(`${COMPANY.name} — ${COMPANY.rc || ''}`, w / 2, pageH - 8, { align: 'center' });

  doc.save(`${sale.invoiceNo}_FACTURE.pdf`);
}
