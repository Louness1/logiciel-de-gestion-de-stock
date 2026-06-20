import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COMPANY } from './company.js';

// Bon de Livraison — version simple, prix TTC final (avec TVA appliquée)
export function generateBonLivraisonPDF(saleRaw) {
  // Defensive: assure que tous les champs essentiels existent
  const sale = {
    invoiceNo:    saleRaw?.invoiceNo || '—',
    createdAt:    saleRaw?.createdAt || new Date().toISOString(),
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

  // === BLOC DEUX COLONNES (info officielle à gauche, titre + meta à droite) ===
  doc.setTextColor(14, 165, 233);
  doc.setFontSize(20).setFont('helvetica', 'bold');
  doc.text("BON DE LIVRAISON", w - 14, y, { align: 'right' });
  doc.setTextColor(60);
  doc.setFontSize(10).setFont('helvetica', 'normal');
  const date = new Date(sale.createdAt).toLocaleDateString('fr-FR');
  doc.text(`N° : ${sale.invoiceNo}`, w - 14, y + 7, { align: 'right' });
  doc.text(`Date : ${date}`, w - 14, y + 12, { align: 'right' });
  const rightEnd = y + 12;

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

  // === BLOC CLIENT ===
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

  // === TABLE ARTICLES ===
  const rows = sale.items.map((it, idx) => [
    String(idx + 1),
    it.product?.name || `Produit #${it.productId || ''}`,
    String(it.quantity || 0),
    `${(Number(it.unitPrice) || 0).toFixed(2)} ${COMPANY.currency}`,
    `${(Number(it.subtotal) || 0).toFixed(2)} ${COMPANY.currency}`,
  ]);
  autoTable(doc, {
    startY: y,
    head: [['#', 'Désignation', 'Cartons', 'P.U.', 'Montant']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [14, 165, 233], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'right' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
  });

  // === TOTAUX ===
  let finalY = doc.lastAutoTable.finalY + 8;
  const sumSubtotals = sale.items.reduce((s, it) => s + (Number(it.subtotal) || 0), 0);
  const totalHT = Math.max(0, sumSubtotals - sale.remiseHT);
  const totalTVA = totalHT * (sale.tvaRate / 100);
  const totalTTC = totalHT + totalTVA;

  // Bloc totaux aligné à droite (label à gauche, montant à l'extrême droite)
  const labelX = w - 90;     // position du libellé
  const valX   = w - 14;     // position de la valeur (alignée à droite)

  doc.setFontSize(10).setFont('helvetica', 'normal').setTextColor(60);
  if (sale.tvaRate > 0) {
    doc.text('Total HT :', labelX, finalY);
    doc.text(`${totalHT.toFixed(2)} ${COMPANY.currency}`, valX, finalY, { align: 'right' });
    finalY += 5;
    doc.text(`TVA (${sale.tvaRate}%) :`, labelX, finalY);
    doc.text(`${totalTVA.toFixed(2)} ${COMPANY.currency}`, valX, finalY, { align: 'right' });
    finalY += 6;
  }

  // Total TTC mis en évidence dans un cadre bleu
  doc.setFillColor(14, 165, 233);
  doc.rect(labelX - 4, finalY - 4, w - 14 - (labelX - 4), 9, 'F');
  doc.setTextColor(255);
  doc.setFontSize(12).setFont('helvetica', 'bold');
  doc.text(sale.tvaRate > 0 ? 'TOTAL TTC :' : 'TOTAL :', labelX, finalY + 2);
  doc.setFontSize(13);
  doc.text(`${totalTTC.toFixed(2)} ${COMPANY.currency}`, valX, finalY + 2, { align: 'right' });
  finalY += 12;
  doc.setTextColor(40);

  if (sale.notes) {
    doc.setTextColor(80);
    doc.setFontSize(9).setFont('helvetica', 'italic');
    doc.text(`Notes : ${sale.notes}`, 14, finalY);
  }

  // === FOOTER : signatures ===
  const pageH = doc.internal.pageSize.getHeight();
  const sigY = pageH - 35;
  doc.setDrawColor(160);
  doc.setLineWidth(0.3);
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(80);
  doc.text('Signature & cachet (Vendeur)', 30, sigY);
  doc.line(20, sigY + 12, 90, sigY + 12);
  doc.text('Signature & cachet (Client)', w - 90, sigY);
  doc.line(w - 100, sigY + 12, w - 30, sigY + 12);

  doc.setFontSize(8).setTextColor(120);
  doc.text(COMPANY.name, w / 2, pageH - 8, { align: 'center' });

  doc.save(`${sale.invoiceNo}_BL.pdf`);
}
