// ===== Étape CLEANING (structuration + nettoyage, avant le chunking) =====
// Code node, mode "Run Once for All Items"
// Entrée : sortie de « Extraction » (Extract from File, joinPages = false) → $json.text = tableau de pages.
// 1. Structure le texte brut en Markdown :
//    - « # N Titre » / « ## N.0 … » au début de chaque chapitre (page « Introduction » ou ligne « Chapter N ») ;
//    - « ## N.M Titre » pour chaque section numérotée, uniquement DANS L'ORDRE (ignore sommaire et tableaux) ;
//    - « # Appendix X | … » et « # References » après le dernier chapitre.
// 2. Retire le bruit de mise en page sans toucher aux titres ni aux séparateurs de page « --- » :
//    en-têtes et pieds de page répétés (repérés automatiquement), numéros de page, crédits, filigranes.
// Fonctionne pour d'autres livres : sections numérotées « 3.2 », chapitres « Chapter 3 », ou rien du tout
// (le Chunking découpe alors par pages).

const NOISE_LINES = [
  /^this openstax book is available for free at/i,   // pied de page OpenStax
  /^access for free at openstax\.org/i,
  /^download for free at/i,
  /^chapter \d{1,2} [a-z].*$/i,                       // en-tête courant « Chapter 5 Entrepreneurship… »
  /^appendix [a-z] \|.*$/i,                           // en-tête courant d'une annexe
  /^\d{1,4}$/,                                       // numéro de page seul
  /^figure \d+\.\d+.*credit.*$/i,                    // crédits photo des figures
  /oceanofpdf/i,                                     // filigrane de site de téléchargement
];
const INLINE = [
  /(\bThis\s+)?OpenStax book is available(\s+for\s+free\s+at)?(\s+https?:\/\/\S*)?/gi,
  /Access for free at openstax\.org\.?/gi,
  /Download for free at\s+\S+/gi,
  /\s?\[\d{1,3}\](?=[\s.,;:!?)]|$)/g,               // renvois numérotés vers la liste des sources « [78] »
];

const isHeading = (l) => /^#{1,6}\s/.test(l);
const isPageBreak = (l) => /^\s*---\s*$/.test(l);
const nonEmpty = (p) => String(p ?? '').split('\n').map(l => l.trim()).filter(Boolean);

// ---------- Structuration : texte brut d'« Extract from File » → Markdown à titres ----------
// Passe 1 : repère les sections numérotées dans l'ordre (pour savoir quel est le dernier chapitre
// et quels chapitres ont des sections). Passe 2 : écrit le Markdown.
function structure(pages, plan) {
  let last = [0, 0];
  const seen = new Set();          // sections « N.M » acceptées
  const appendixDone = new Set();
  let refsDone = false;
  const lastChapter = plan ? plan.lastChapter : Infinity;
  const isNext = (c, s) =>
    (last[0] === 0 && c === 1 && (s === 1 || s === 0)) ||
    (c === last[0] && (s === last[1] + 1 || s === last[1] + 2)) ||
    (c === last[0] + 1 && (s === 1 || s === 0));
  const afterBook = () => last[0] >= lastChapter;      // dernier chapitre atteint (annexes, références)

  const out = pages.map(p => {
    const ls = String(p ?? '').split('\n');
    const res = [];
    const top = nonEmpty(p);
    let k0 = 0;

    // Début de chapitre, cas 1 : la page commence par « Introduction » et le chapitre suivant a des sections
    // numérotées (livres OpenStax et manuels du même type).
    const next = last[0] + 1;
    if (plan && next <= lastChapter && top[0] === 'Introduction' && plan.seen.has(`${next}.1`) && (last[0] === 0 || last[1] >= 1)) {
      res.push(`## ${next}.0 Introduction`);
      last = [next, 0];
      k0 = ls.findIndex(l => l.trim() === 'Introduction') + 1;
    }
    // Début de chapitre, cas 2 : ligne « Chapter N » / « Chapitre N » (seule ou suivie du titre) en haut de page.
    if (next <= lastChapter && k0 === 0) {     // aussi en passe 1, pour connaître le dernier chapitre
      for (let t = 0; t < Math.min(4, top.length); t++) {
        const m = top[t].match(/^(?:chapter|chapitre)\s+(\d{1,2})\s*(?:[:.\-–—]\s*)?([A-ZÀ-Ý].{2,120})?$/i);
        if (!m || +m[1] !== next || (m[2] && /\s\d{1,4}$/.test(top[t]))) continue;   // « Titre 123 » = sommaire / en-tête
        const title = (m[2] || top[t + 1] || '').trim();
        res.push(`# ${next} ${title}`);
        res.push(`## ${next}.0 ${plan && plan.seen.has(`${next}.1`) ? 'Introduction' : title}`);
        last = [next, 0];
        const idx = ls.findIndex(l => l.trim() === top[t]);
        k0 = idx + 1 + (m[2] ? 0 : 1);
        break;
      }
    }

    for (let k = k0; k < ls.length; k++) {
      const t = ls[k].trim();
      let m = t.match(/^(\d{1,2})\.(\d{1,2})$/);
      if (m && isNext(+m[1], +m[2]) && +m[2] > 0) {
        const j = ls.slice(k + 1, k + 6).findIndex(x => x.trim() && !/^[\d.]+$/.test(x.trim()));
        if (j >= 0) {
          res.push(`## ${m[1]}.${m[2]} ${ls[k + 1 + j].trim()}`);
          last = [+m[1], +m[2]]; seen.add(`${m[1]}.${m[2]}`);
          k = k + 1 + j;
          continue;
        }
      }
      m = t.match(/^(\d{1,2})\.(\d{1,2})\s+([A-Z][^\n•]{3,120})$/);
      if (m && !/\s\d{1,4}$/.test(t) && isNext(+m[1], +m[2]) && +m[2] > 0) {
        res.push(`## ${m[1]}.${m[2]} ${m[3].trim()}`);
        last = [+m[1], +m[2]]; seen.add(`${m[1]}.${m[2]}`);
        continue;
      }
      if (plan && afterBook()) {
        const a = t.match(/^Appendix\s+([A-Z])\b\s*[|:.\-–—]?\s*(.*)$/);
        if (a && !appendixDone.has(a[1])) { res.push(`# Appendix ${a[1]} | ${a[2].replace(/[*\s]*\d{0,4}\s*$/, '').trim()}`); appendixDone.add(a[1]); continue; }
        if (!refsDone && /^(References|Bibliography|Index)$/.test(t)) { res.push('# References'); refsDone = true; continue; }
      }
      res.push(ls[k]);
    }
    return res.join('\n');
  });
  return { md: out.join('\n\n---\n\n'), seen, lastChapter: last[0] };
}

// ---------- Structuration par le SOMMAIRE (livres sans numéros : essais, guides…) ----------
// Utilisé seulement si la passe 1 n'a trouvé ni « Chapter N » ni section « N.M ».
// 1. Lit le sommaire (« Contents », « Table of Contents », « Sommaire »…) au début du livre :
//    « PART I: … » = partie, ligne EN MAJUSCULES = chapitre, autre ligne = section du chapitre,
//    « Appreciation / Sources / About the author… » = fin du livre (non indexée).
// 2. Retrouve ces titres DANS L'ORDRE dans le texte (un titre peut être coupé sur 2-3 lignes)
//    et écrit « # N Titre », « ## N.0 Titre », « ## N.M Section » comme pour un livre numéroté.
// Les numéros N / N.M sont internes (ordre, identifiants, filtres) : les citations montrent les titres.
const norm = (s) => String(s).normalize('NFKD').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
const SMALL = new Set(['a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs']);
const titleCase = (s) => s.toLowerCase().split(' ')
  .map((w, i) => (i > 0 && SMALL.has(w) ? w : w.replace(/^([("“'‘]?)(\p{L})/u, (_, a, b) => a + b.toUpperCase())))
  .join(' ');
const END_MATTER = /^(appreciation|acknowledge?ments?|sources|notes|endnotes|references|bibliography|index|about the authors?)$/i;

function tocStructure(pages) {
  // --- 1. le sommaire ---
  const flat = [];                                   // lignes non vides : { page, text }
  pages.forEach((p, pi) => nonEmpty(p).forEach(t => flat.push({ page: pi, text: t })));
  const limit = Math.max(10, Math.ceil(pages.length * 0.1));
  const start = flat.findIndex(l => l.page < limit && /^(contents|table of contents|sommaire|table des matières)$/i.test(l.text));
  if (start < 0) return null;

  const entries = [];
  let k = start + 1;
  for (; k < flat.length && flat[k].page <= flat[start].page + 4; k++) {
    const t = flat[k].text.replace(/[\s.·…]*\d{1,4}$/, '').trim();       // « Titre ..... 12 » → « Titre »
    if (!t || t.length > 90 || /[.!?]$/.test(t) && !/…$/.test(flat[k].text)) break;   // une phrase = le livre a commencé
    if (entries.length >= 3) {                       // le 1er titre réapparaît (coupé ou non) : fin du sommaire
      const first = norm(entries[0]);
      const w = norm(t) + norm(flat[k + 1]?.text || '') + norm(flat[k + 2]?.text || '');
      if (first.length > 3 && w.startsWith(first) && norm(t).length < first.length + 1) break;
    }
    entries.push(t);
  }
  const bodyStart = k;

  // Ligatures « fi » / « fl » mal extraites du PDF : « Specif ic » → « Specific »
  // (on recolle seulement si le mot entier est plus fréquent dans le livre que le morceau seul)
  const freq = new Map();
  for (const l of flat) for (const w of l.text.toLowerCase().match(/[a-z]+/g) || []) freq.set(w, (freq.get(w) || 0) + 1);
  const fixLig = (s) => s.replace(/\b([A-Za-z]*f) ([il][a-z]+)\b/g, (m, a, b) =>
    ((freq.get((a + b).toLowerCase()) || 0) > (freq.get(b.toLowerCase()) || 0) ? a + b : m));
  for (let i = 0; i < entries.length; i++) entries[i] = fixLig(entries[i]);

  let part = '', chapter = 0, section = 0, ended = false;
  const plan = [];                                   // titres attendus dans le corps, dans l'ordre
  for (const e of entries) {
    if (ended) break;
    const pm = e.match(/^part\s+([ivx]+|\d+)\b[\s:.\-–—]*(.*)$/i);
    if (END_MATTER.test(e)) { plan.push({ kind: 'end', text: e }); ended = true; }
    else if (pm) { part = `Part ${pm[1].toUpperCase()}${pm[2] ? ': ' + titleCase(pm[2]) : ''}`; plan.push({ kind: 'part', text: e }); }
    else if (!/\p{Ll}/u.test(e)) {                   // EN MAJUSCULES = chapitre
      if (/^(bonus|appendix|appendices|annexes?)\b/i.test(e)) part = '';
      chapter++; section = 0;
      plan.push({ kind: 'chapter', text: e, n: chapter, title: titleCase(e), part });
    } else if (chapter > 0) {
      section++;
      plan.push({ kind: 'section', text: e, n: chapter, s: section, title: e });
    }
  }
  if (plan.filter(x => x.kind === 'chapter').length < 2) return null;

  // --- 2. les titres dans le corps du livre ---
  const titles = {}, parts = {}, missing = [];
  let next = 0;
  const out = pages.map(() => []);
  const consumed = new Set();
  for (let i = bodyStart; i < flat.length; i++) {
    let hit = null;
    for (let j = next; j < Math.min(plan.length, next + 4) && !hit; j++) {
      const target = norm(plan[j].text);
      let raw = '', w = '';
      for (let n = 0; n < 3 && i + n < flat.length; n++) {
        raw += (n ? ' ' : '') + flat[i + n].text; w += norm(flat[i + n].text);
        const sameCase = !/\p{Ll}/u.test(raw) || raw.replace(/\s+/g, ' ') === plan[j].text;
        if (w === target && sameCase) { hit = { j, len: n + 1 }; break; }
        if (!target.startsWith(w)) break;
      }
    }
    if (hit) {
      for (let j = next; j < hit.j; j++) missing.push(plan[j].text);
      const e = plan[hit.j];
      const pg = flat[i].page;
      if (e.kind === 'chapter') {
        titles[e.n] = e.title; parts[e.n] = e.part;
        out[pg].push(`# ${e.n} ${e.title}`, `## ${e.n}.0 ${e.title}`);
      } else if (e.kind === 'section') out[pg].push(`## ${e.n}.${e.s} ${e.title}`);
      else if (e.kind === 'end') out[pg].push('# References');
      for (let n = 0; n < hit.len; n++) consumed.add(i + n);
      next = hit.j + 1;
      i += hit.len - 1;
      continue;
    }
    if (!consumed.has(i)) out[flat[i].page].push(flat[i].text);
  }
  // les pages du sommaire et de la couverture restent (texte avant le 1er titre : ignoré par le Chunking)
  for (let i = 0; i < bodyStart; i++) out[flat[i].page].unshift(flat[i].text);
  return { md: out.map(ls => ls.join('\n')).join('\n\n---\n\n'), titles, parts, missing, found: next };
}

// En-têtes / pieds de page répétés : une ligne (chiffres retirés) présente en haut ou en bas
// d'au moins 10 % des pages (et au moins 5 pages) est du bruit de mise en page.
function repeatedEdges(pages) {
  const norm = (l) => l.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
  const count = new Map();
  for (const p of pages) {
    const ls = nonEmpty(p);
    const edges = new Set([...ls.slice(0, 2), ...ls.slice(-2)].map(norm).filter(x => x.length > 3));
    for (const e of edges) count.set(e, (count.get(e) || 0) + 1);
  }
  const min = Math.max(5, Math.ceil(pages.length * 0.10));
  return { norm, set: new Set([...count].filter(([, n]) => n >= min).map(([e]) => e)) };
}

let removed = 0;
let mode = 'numérotée', tocTitles = null, tocParts = {}, tocMissing = [];
const out = $input.all().map(item => {
  const src = item.json.text;
  let raw, edges = { norm: (x) => x, set: new Set() };
  if (Array.isArray(src)) {
    const plan = structure(src, null);             // passe 1
    const toc = plan.lastChapter === 0 && plan.seen.size === 0 ? tocStructure(src) : null;
    if (toc) {                                     // livre sans numéros : structure lue dans le sommaire
      raw = toc.md; mode = 'sommaire'; tocTitles = toc.titles; tocParts = toc.parts; tocMissing = toc.missing;
    } else {
      raw = structure(src, plan).md;               // passe 2
      mode = plan.lastChapter > 0 ? 'numérotée' : 'pages';
    }
    edges = repeatedEdges(src);
  } else {
    raw = String(src ?? '');                       // texte déjà en Markdown : gardé tel quel
  }
  const before = raw.length;

  const lines = raw.split('\n').filter(l => {
    if (isHeading(l) || isPageBreak(l)) return true;          // on garde toujours titres et sauts de page
    const t = l.replace(/\*\*/g, '').trim();
    if (edges.set.has(edges.norm(t))) return false;
    return !NOISE_LINES.some(re => re.test(t));
  });

  // En-têtes courants collés au milieu d'une ligne (« … 170 Chapter 5 Entrepreneurship: … ») :
  // on lit les titres de chapitre, puis on les retire en ligne.
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  // Priorité 1 : lignes explicites « Chapter N Titre » ; priorité 2 : titres Markdown « # N Titre ».
  const titles = {};
  const allLines = raw.split('\n');
  for (const l of allLines) {
    const t = l.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').trim();
    const m = t.match(/^Chapter\s+(\d{1,2})\s+([A-Z][^\n]{3,140})$/);
    if (m && !titles[m[1]]) titles[m[1]] = m[2].replace(/\s+\d{1,4}$/, '').trim();
  }
  for (const l of allLines) {
    if (!isHeading(l)) continue;
    const t = l.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').trim();
    const m = t.match(/^(\d{1,2})\s+([A-Z][^\n]{3,140})$/);
    if (m && !titles[m[1]]) titles[m[1]] = m[2].replace(/\s+\d{1,4}$/, '').trim();
  }
  const inlineHeaders = Object.entries(titles).map(([n, t]) =>
    new RegExp(`(\\b\\d{1,4}\\s+)?Chapter\\s+${n}\\s+${esc(t)}(\\s+\\d{1,4}\\b)?`, 'g'));
  for (const l of allLines) {
    const a = l.match(/^# Appendix ([A-Z]) \| (.+)$/);
    if (a) inlineHeaders.push(new RegExp(`(\\b\\d{1,4}\\s+)?Appendix ${a[1]} \\|\\s+${esc(a[2].trim())}(\\s+\\d{1,4}\\b)?`, 'g'));
  }

  let text = lines
    .map(l => (isHeading(l) ? l : inlineHeaders.reduce((acc, re) => acc.replace(re, ' '), l)))
    .join('\n');
  for (const re of INLINE) text = text.replace(re, ' ');
  text = text
    .replace(/(\w)-\n(\w)/g, '$1$2')     // recolle les mots coupés « busi-\nness »
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');

  removed += before - text.length;
  // titres de chapitre lus AVANT suppression des en-têtes courants : transmis au Chunking en secours
  if (tocTitles) Object.assign(titles, tocTitles);
  return { json: { text, structure: mode, chapter_titles: titles, chapter_parts: tocParts, titres_introuvables: tocMissing, caracteres_avant: before, caracteres_apres: text.length } };
});

return out;
