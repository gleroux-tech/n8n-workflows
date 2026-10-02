// ===== Top N (fin de l'étape RERANKING) =====
// Code node, mode "Run Once for All Items"
// Lit les scores du reranker Cohere ({ results: [{ index, relevance_score }] }) et garde
// au plus top_n passages dont le score dépasse le seuil (config du nœud « Contexte »).
// Si Cohere n'a pas répondu (erreur, quota), on garde les top_n de la fusion RRF : le chat continue.
const prev = $('Candidats').first().json;
const { top_n, seuil } = prev.config;
const res = $input.first().json || {};

let kept, mode;
if (Array.isArray(res.results)) {
  mode = 'cohere';
  kept = res.results
    .filter(r => r.relevance_score >= seuil)
    .sort((a, b) => b.relevance_score - a.relevance_score)
    .slice(0, top_n)
    .map(r => ({ ...prev.candidates[r.index], score: Number(r.relevance_score.toFixed(3)) }));
} else {
  mode = 'secours RRF (Cohere indisponible)';
  kept = prev.candidates.slice(0, top_n);
}

// Référence de source : livre, chapitre (ou annexe), section (si le livre en a), page.
// Livre structuré par son sommaire : livre, partie › chapitre › section, page.
const short = (t) => String(t || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
const label = (c) => {
  if (c.structure === 'sommaire') {               // livre sans numéros : on cite ses titres
    const where = [c.part, c.chapter_title, /\.0$/.test(String(c.section)) ? '' : c.section_title].filter(Boolean).join(' › ');
    return [c.book && `« ${short(c.book)} »`, where, `p. ${c.page}`].filter(Boolean).join(', ');
  }
  const appendix = /^[A-Z]$/.test(String(c.chapter));
  return [
    c.book && `« ${short(c.book)} »`,
    appendix ? `annexe ${c.chapter}` : (c.chapter !== '' && c.chapter != null ? `chapitre ${c.chapter}${c.chapter_title ? ' « ' + c.chapter_title + ' »' : ''}` : ''),
    c.section && c.section !== 'p' && !appendix ? `section ${c.section} « ${c.section_title} »` : '',
    `p. ${c.page}`,
  ].filter(Boolean).join(', ');
};

const context = kept.length
  ? kept.map(c => `[Source : ${label(c)}]\n${c.passage}`).join('\n\n---\n\n')
  : 'AUCUN PASSAGE PERTINENT';

return [{ json: {
  question: prev.question,
  context,
  sources_count: kept.length,
  reranking: mode,
  scores: kept.map(c => ({ section: c.section, page: c.page, score: c.score ?? null, trouve_par: c.trouve_par })),
} }];
