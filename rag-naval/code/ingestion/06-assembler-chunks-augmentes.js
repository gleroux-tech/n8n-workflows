// ===== Assembler les chunks augmentés (étape AUGMENTATION, après « Augmentation IA (Gemini) ») =====
// Code node, mode "Run Once for All Items"
// Pour chaque chunk du lot, lit le JSON produit par Gemini (contexte, questions hypothétiques,
// mots-clés, entités, relations) et construit le texte qui sera vectorisé :
//   en-tête + augmentations EN TÊTE (jamais tronquées par l'embedding) puis « Passage: » + texte du livre.
// Un chunk dont l'augmentation est illisible n'est PAS envoyé à la vectorisation : il reste « à indexer »
// et sera retraité au prochain dépôt du PDF (ingestion reprenable). Les autres continuent.
const chunks = $('Limite (chunks par exécution)').all();
const llm = $input.all();

const str = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const list = (v, n, max) => (Array.isArray(v) ? v : []).map(x => str(x, max)).filter(Boolean).slice(0, n);

const out = [];
llm.forEach((item, i) => {
  const chunk = chunks[item.pairedItem?.item ?? i]?.json;
  if (!chunk) return;
  // Nœud Google Gemini (sortie JSON) : le texte est dans content.parts[].text
  const raw = String(item.json.text ?? (item.json.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join(''));
  let a = {};
  try { const m = raw.match(/\{[\s\S]*\}/); a = JSON.parse(m ? m[0] : raw); } catch (e) { a = {}; }

  const contexte = str(a.contexte, 400);
  const questions = list(a.questions, 5, 200);
  const motsCles = [...new Set(list(a.mots_cles, 12, 40).map(k => k.toLowerCase()))];
  const entites = (Array.isArray(a.entites) ? a.entites : [])
    .map(e => (typeof e === 'string' ? { nom: e } : e || {}))
    .map(e => ({ nom: str(e.nom, 60), type: str(e.type, 25) }))
    .filter(e => e.nom).slice(0, 12);
  const relations = (Array.isArray(a.relations) ? a.relations : [])
    .map(r => r || {})
    .map(r => ({ source: str(r.source, 60), relation: str(r.relation, 50), cible: str(r.cible, 60) }))
    .filter(r => r.source && r.relation && r.cible).slice(0, 8);
  if (!contexte || !questions.length || !motsCles.length) return;   // illisible → retraité au prochain dépôt

  const nl = chunk.content.indexOf('\n');
  const header = nl > 0 ? chunk.content.slice(0, nl) : '';
  const passage = nl > 0 ? chunk.content.slice(nl + 1) : chunk.content;
  const blocs = [header, `Context: ${contexte}`, `Keywords: ${motsCles.join(', ')}`];
  if (entites.length) blocs.push(`Entities: ${entites.map(e => (e.type ? `${e.nom} (${e.type})` : e.nom)).join('; ')}`);
  if (relations.length) blocs.push(`Relations: ${relations.map(r => `${r.source} — ${r.relation} → ${r.cible}`).join('; ')}`);
  blocs.push(`Questions this passage answers:\n${questions.map(q => `- ${q}`).join('\n')}`);
  blocs.push(`Passage:\n${passage}`);

  out.push({ json: {
    ...chunk,
    content: blocs.join('\n'),
    contexte,
    questions: questions.join(' | '),
    mots_cles: motsCles.join(', '),
    entites: entites.map(e => e.nom).join(', '),
    relations: relations.map(r => `${r.source} — ${r.relation} → ${r.cible}`).join(' | '),
    augmente: 'oui',
  } });
});
return out;
