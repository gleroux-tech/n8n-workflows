// ===== Bilan =====
// Code node, mode "Run Once for All Items" : volume traité par ce run, pour CE livre.
const prep = $('Préparer le fichier').first().json;
const ids = new Set($('Augmentation (métadonnées)').all().map(i => i.json.chunk_id));
const total = ids.size;
const deja = $('Déjà indexés').all().filter(i => i.json && ids.has(i.json.chunk_id)).length;   // de ce livre seulement
const autres = $('Déjà indexés').all().filter(i => i.json && i.json.chunk_id && !ids.has(i.json.chunk_id)).length;
const envoyes = $('Limite (chunks par exécution)').all().length;     // chunks du lot
const augmentes = $('Assembler les chunks augmentés').all().length;  // augmentation IA lisible
const faits = $input.all().filter(i => i.json && i.json.statut === 'indexé').length;
const restants = Math.max(0, total - deja - faits);
return [{ json: {
  livre: prep.book_title,
  livre_id: prep.book_id,
  chunks_du_livre: total,
  deja_indexes_avant: deja,
  lot_ce_run: envoyes,
  augmentes_ce_run: augmentes,
  indexes_ce_run: faits,
  restants,
  autres_chunks_en_base: autres,
  statut: restants === 0
    ? 'Livre entièrement indexé'
    : (deja === 0 && autres > 0
      ? `Nouveau livre « ${prep.book_id} » : si c'est un livre déjà commencé, le titre ne correspond pas (redépose avec le même titre)`
      : 'Lot terminé : redépose le PDF (même titre) pour indexer la suite, ou augmente la limite dans le nœud « Limite »'),
} }];
