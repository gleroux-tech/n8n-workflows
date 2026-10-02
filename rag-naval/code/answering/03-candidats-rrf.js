// ===== Candidats (fin de l'étape SEARCH, recherche hybride) =====
// Code node, mode "Run Once for All Items"
// Fusionne deux listes de passages :
//   - « Recherche »            : les plus proches par le sens (embeddings Gemini, pgvector) ;
//   - « Recherche mots-clés »  : les meilleurs par les mots (plein texte sur le contenu augmenté).
// Fusion par Reciprocal Rank Fusion : score = Σ 1 / (60 + rang). Le filtre du routing (ex. chapitre)
// est aussi appliqué aux résultats vectoriels. Pour chaque passage :
//   - doc     : texte envoyé au reranker (contexte de l'augmentation + passage) ;
//   - passage : texte du livre seul, pour la génération.
const sel = $('Parse routing').first().json;
const K = 60;
const MAX = sel.config.max_candidats;
const filtre = sel.filtre || {};

const read = (j) => {
  const doc = j.document || j;
  return { content: String(doc.pageContent ?? doc.content ?? ''), meta: doc.metadata || {} };
};
const okFiltre = (meta) => Object.entries(filtre).every(([k, v]) => String(meta[k] ?? '') === String(v));

const pool = new Map();
const add = (items, source) => {
  let rank = 0;
  for (const item of items) {
    const { content, meta } = read(item.json || {});
    if (!content || !okFiltre(meta)) continue;
    const id = meta.chunk_id || content.slice(0, 120);
    const cur = pool.get(id) || { content, meta, rrf: 0, sources: [] };
    cur.rrf += 1 / (K + ++rank);
    cur.sources.push(source);
    pool.set(id, cur);
  }
};
add($('Recherche').all(), 'sens');
add($input.all(), 'mots-clés');

// Découpe le contenu augmenté : « [en-tête] / Context / Keywords / … / Passage: texte »
const split = (content) => {
  const i = content.indexOf('\nPassage:\n');
  if (i < 0) {
    const nl = content.indexOf('\n');
    return { header: nl > 0 ? content.slice(0, nl) : '', passage: nl > 0 ? content.slice(nl + 1) : content, contexte: '' };
  }
  const head = content.slice(0, i);
  return {
    header: head.split('\n')[0],
    contexte: (head.match(/\nContext: (.*)/) || [])[1] || '',
    passage: content.slice(i + '\nPassage:\n'.length),
  };
};

const candidates = [...pool.values()]
  .sort((a, b) => b.rrf - a.rrf)
  .slice(0, MAX)
  .map((c, i) => {
    const s = split(c.content);
    return {
      n: i,
      doc: [s.header, s.contexte, s.passage].filter(Boolean).join('\n').slice(0, 4000),
      passage: s.passage,
      book: c.meta.book ?? '',
      part: c.meta.part ?? '',
      chapter: c.meta.chapter ?? '',
      chapter_title: c.meta.chapter_title ?? '',
      section: c.meta.section ?? '',
      section_title: c.meta.section_title ?? '',
      structure: c.meta.structure ?? '',
      page: c.meta.page ?? '',
      trouve_par: c.sources.join(' + '),
      rrf: Number(c.rrf.toFixed(4)),
    };
  });

return [{ json: {
  question: sel.standalone_fr || sel.question,
  question_en: sel.question_en,
  candidates,
  documents: candidates.map(c => c.doc),
  config: sel.config,
} }];
