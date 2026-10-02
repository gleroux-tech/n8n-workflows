// ===== Score =====
// Code node, mode "Run Once for All Items"
// Associe chaque cas du « Jeu de test » à la réponse du chatbot (même ordre), puis calcule le score.
// Une réponse est bonne si elle ne refuse pas ET cite dans ses sources une des sections attendues.
// Le premier item est le résumé, les suivants le détail.

const cases = $('Jeu de test').all().map(i => i.json);
const answers = $input.all().map(i => i.json);

const REFUSAL = /ne traite pas|uniquement à partir|sort de ce cadre|n'aborde pas|ne couvre pas|pas dans (le|ce) livre/i;
const low = (s) => String(s).toLowerCase().replace(/[’']/g, "'");

const rows = cases.map((c, i) => {
  const a = answers[i] || {};
  const text = String(a.output ?? a.text ?? a.message ?? (a.error ? `ERREUR : ${JSON.stringify(a.error)}` : JSON.stringify(a)));
  const sources = text.slice(Math.max(0, text.search(/sources\s*:/i)));     // la ligne « 📖 Sources : … »
  const refused = REFUSAL.test(text);
  const cites = c.attendu.filter(t => low(sources).includes(low(t)));
  const ok = c.refuse ? refused : (!refused && cites.length > 0);
  let why = '';
  if (!ok) {
    if (c.refuse) why = "n'a pas refusé";
    else if (refused) why = 'refus à tort';
    else why = `sources sans section attendue (${c.attendu.join(' / ')})`;
  }
  return { id: c.id, type: c.kind, question: c.question, ok, why, sections_citees: cites.join(', '), reponse: text.slice(0, 500) };
});

const pick = (kinds) => rows.filter(r => kinds.includes(r.type));
const rate = (list) => `${list.filter(r => r.ok).length}/${list.length}`;
const inBook = pick(['livre', 'vie réelle']);
const inBookOk = inBook.filter(r => r.ok).length;

const summary = {
  id: 'RÉSUMÉ',
  questions_livre: rate(pick(['livre'])),
  questions_vie_reelle: rate(pick(['vie réelle'])),
  question_de_suivi: rate(pick(['suivi'])),
  refus_hors_sujet: rate(pick(['hors sujet'])),
  objectif_80_pourcent: inBookOk / inBook.length >= 0.8 ? 'ATTEINT' : 'NON ATTEINT',
  objectif_3_refus_sur_3: pick(['hors sujet']).every(r => r.ok) ? 'ATTEINT' : 'NON ATTEINT',
  echecs: rows.filter(r => !r.ok).map(r => `${r.id} : ${r.why}`).join(' | ') || 'aucun',
};

return [{ json: summary }, ...rows.map(r => ({ json: r }))];
