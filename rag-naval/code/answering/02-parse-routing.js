// ===== Parse routing =====
// Lit le JSON de l'étape Routing (Gemini) de façon tolérante et prépare la recherche :
//   - query_en      : requête pour la recherche vectorielle ;
//   - question_en   : question complète en anglais, pour le reranker ;
//   - mots_cles     : requête de la recherche plein texte ;
//   - filtre        : métadonnées imposées (chapitre cité explicitement), {} sinon.
// Filtre permissif : seul un in_scope explicitement false déclenche le refus.
// Nœud Google Gemini (sortie JSON) : le texte est dans content.parts[].text
const j0 = $input.first().json;
const raw = String(j0.text ?? (j0.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join(''));
const ctx = $('Contexte').first().json;

let r = {};
try {
  const m = raw.match(/\{[\s\S]*\}/);
  r = JSON.parse(m ? m[0] : raw);
} catch (e) {
  r = {};
}

const standalone = String(r.standalone_fr || ctx.question).trim();
const queryEn = String(r.query_en || standalone).trim();
const motsCles = (Array.isArray(r.mots_cles_en) ? r.mots_cles_en : []).map(String).filter(Boolean).slice(0, 12);
const filtre = {};
const ch = r.filtres && r.filtres.chapitre;
if (ch !== null && ch !== undefined && /^\d{1,2}$/.test(String(ch).trim())) filtre.chapter = String(ch).trim();

return [{ json: {
  sessionId: ctx.sessionId,
  question: ctx.question,
  standalone_fr: standalone,
  in_scope: r.in_scope !== false,
  query_en: queryEn,
  question_en: String(r.question_en || queryEn).trim(),
  mots_cles: [queryEn, ...motsCles].join(' '),
  filtre,
  config: ctx.config,
} }];
