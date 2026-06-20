// Compat layer — l'ancien generateInvoicePDF redirige vers le nouveau Bon de Livraison.
// Conservé pour éviter les erreurs si un cache de navigateur garde une vieille référence.
export { generateBonLivraisonPDF as generateInvoicePDF } from './livraisonPDF.js';
