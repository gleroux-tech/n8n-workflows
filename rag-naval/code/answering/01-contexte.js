// ===== 1. CONTEXTE (messages + config) =====
// Code node, mode "Run Once for All Items"
// Rassemble ce dont les étapes suivantes ont besoin :
//   - messages : la question + les 4 derniers échanges de la session (table chat_messages) ;
//   - config   : réglages de la recherche, modifiables ici sans toucher aux autres nœuds.
const CONFIG = {
  top_k: 15,          // passages ramenés par chaque recherche (vecteurs, mots-clés)
  max_candidats: 20,  // passages envoyés au reranker après fusion
  top_n: 4,           // passages gardés pour la génération
  seuil: 0.1,         // score Cohere minimum (0 → 1) pour qu'un passage soit gardé
  rerank_model: 'rerank-v3.5',
};

const q = $('Question reçue').first().json;
const rows = $input.all().map(i => i.json).filter(r => r && r.role && r.content);
const history = rows
  .slice(-8)
  .map(r => `${r.role === 'user' ? 'Utilisateur' : 'Assistant'} : ${String(r.content).slice(0, 600)}`)
  .join('\n');

return [{ json: {
  sessionId: q.sessionId,
  question: q.chatInput,
  history: history || '(aucun échange précédent)',
  config: CONFIG,
} }];
