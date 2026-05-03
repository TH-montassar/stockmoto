const XLSX = require('xlsx');
const fs = require('fs');
const { EXCEL_FILE } = require('./constants');

function generateExcel(jsonData) {
  try {
    const wb = XLSX.utils.book_new();

    // Sheet: Produits
    const prodHeaders = ['Référence', 'Désignation', 'Sous-catégorie', 'Catégorie', 'Type', 'Marque', '📍 Emplacement', 'Quantité', 'Seuil Alerte', 'Prix Achat (DT)', 'Prix Vente (DT)', 'Description'];
    const prodRows = (jsonData.produits || []).map(p => [p.ref, p.nom, p.sousCategorie, p.cat, p.type, p.marque, p.emplacement, p.qty, p.alerte, p.achat, p.vente, p.desc]);
    const wsProd = XLSX.utils.aoa_to_sheet([prodHeaders, ...prodRows]);
    wsProd['!cols'] = prodHeaders.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, wsProd, 'Produits');

    // Sheet: Marques & Emplacements
    if ((jsonData.marques || []).length > 0) {
      const marqHeaders = ['Marque', 'Emplacements (A-Z)', 'Nb Produits'];
      const marqRows = (jsonData.marques || []).map(m => [
        m.nom,
        (m.emplacements || []).join(', '),
        (jsonData.produits || []).filter(p => p.marque === m.nom).length
      ]);
      const wsMarq = XLSX.utils.aoa_to_sheet([marqHeaders, ...marqRows]);
      wsMarq['!cols'] = marqHeaders.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(wb, wsMarq, 'Marques');
    }

    // Sheet: Mouvements
    const mvtHeaders = ['Date', 'Type', 'Produit', 'Quantité', 'Prix Unitaire (DT)', 'Client/Fournisseur', 'Note'];
    const mvtRows = (jsonData.mouvements || []).map(m => [
      new Date(m.date).toLocaleString('fr-FR'), m.type, m.produitNom, m.qty, m.prix, m.tiers, m.note
    ]);
    const wsMvt = XLSX.utils.aoa_to_sheet([mvtHeaders, ...mvtRows]);
    wsMvt['!cols'] = mvtHeaders.map(() => ({ wch: 20 }));
    XLSX.utils.book_append_sheet(wb, wsMvt, 'Mouvements');

    // Sheet: Véhicules
    if ((jsonData.vehicules || []).length > 0) {
      const vehHeaders = ['Type', 'Marque', 'Modèle', 'Année', 'Couleur', 'Châssis', 'Cylindrée (cc)', 'Quantité', 'Prix Achat (DT)', 'Prix Vente (DT)', 'Statut', 'Notes'];
      const vehRows = (jsonData.vehicules || []).map(v => [v.type, v.marque, v.modele, v.annee, v.couleur, v.chassis, v.cylindree, v.qty, v.achat, v.vente, v.statut, v.notes]);
      const wsVeh = XLSX.utils.aoa_to_sheet([vehHeaders, ...vehRows]);
      wsVeh['!cols'] = vehHeaders.map(() => ({ wch: 16 }));
      XLSX.utils.book_append_sheet(wb, wsVeh, 'Véhicules');
    }

    // Sheet: Ventes Véhicules
    if ((jsonData.ventesVehicules || []).length > 0) {
      const saleHeaders = ['Date', 'Véhicule', 'Type', 'Quantité', 'Prix Réf. (DT)', 'Prix Final (DT)', 'Total (DT)', 'Client', 'Téléphone', 'Paiement', 'Note'];
      const saleRows = (jsonData.ventesVehicules || []).map(s => [
        new Date(s.date).toLocaleString('fr-FR'), s.vehiculeLabel, s.type,
        s.qty, s.prixRef, s.prixFinal, (s.prixFinal * s.qty),
        s.client, s.tel, s.paiement, s.note
      ]);
      const wsSales = XLSX.utils.aoa_to_sheet([saleHeaders, ...saleRows]);
      wsSales['!cols'] = saleHeaders.map(() => ({ wch: 18 }));
      XLSX.utils.book_append_sheet(wb, wsSales, 'Ventes Véhicules');
    }

    XLSX.writeFile(wb, EXCEL_FILE);
    return true;
  } catch (err) {
    console.error('Excel error:', err.message);
    return false;
  }
}

module.exports = { generateExcel };
