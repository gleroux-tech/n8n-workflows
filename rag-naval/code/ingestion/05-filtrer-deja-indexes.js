// ===== Filtrer les chunks déjà indexés (ingestion reprenable) =====
// Code node, mode "Run Once for All Items"
// « Déjà indexés » a lu dans Supabase la liste des chunk_id présents (vue indexed_chunks).
// On ne garde que les chunks manquants : relancer l'ingestion après une coupure
// (quota Gemini, timeout n8n…) reprend là où elle s'était arrêtée, sans doublon.

const done = new Set(
  $('Déjà indexés').all()
    .map(item => item.json && item.json.chunk_id)
    .filter(Boolean)
);

const all = $('Augmentation (métadonnées)').all();
const todo = all.filter(item => !done.has(item.json.chunk_id));

// Rien à faire : on s'arrête proprement (aucun item → la boucle ne tourne pas).
return todo;
