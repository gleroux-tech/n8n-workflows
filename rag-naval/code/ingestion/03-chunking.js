// ===== Découpage aux titres (H1 / H2) + Recursive Character Text Splitter (5 000, sans overlap) =====
// Code node, mode "Run Once for All Items"
// Entrée : sortie de « Cleaning » → $json.text = Markdown du livre, pages séparées par une ligne « --- ».
// Règle du prof :
//   - # (H1) = chapitre, ## (H2) = section → on coupe d'abord aux titres ;
//   - aucun morceau ne dépasse 5 000 caractères : une section trop longue est
//     recoupée récursivement (paragraphes → lignes → phrases → mots).
// Sécurité : on ne retient que les titres NUMÉROTÉS et DANS L'ORDRE
// (1.0 → 1.1 → 1.2 → 2.0 → 2.1…), car certaines légendes ressemblent à des titres.
// N.0 = introduction du chapitre (ou chapitre entier pour un livre sans sections numérotées).
// Livre sans aucun titre repérable : découpage de secours par pages (section « p »).
// Sortie : 1 item par chunk { text, part, chapter, chapter_title, section, section_title, structure, page, chunk_index }
//          + un item de bilan en tête est inutile : le bilan est dans « Bilan ».

const CHUNK_SIZE = 5000;
const CHUNK_OVERLAP = 0;   // pas de chevauchement (choix du projet)
const SEPARATORS = ['\n## ', '\n### ', '\n#### ', '\n\n', '\n', '. ', ' ', ''];

// ---------- 1. Texte complet + repérage des pages ----------
const md = $input.all().map(i => String(i.json.text ?? '')).join('\n\n---\n\n');
const lines = md.split('\n');
let page = 1;
const linePage = lines.map(l => (/^\s*---\s*$/.test(l) ? ++page : page));

// ---------- 2. Titres numérotés, dans l'ordre ----------
const clean = (l) => l.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').replace(/<[^>]+>/g, '').trim();
const H1 = /^(?:Chapter\s+)?(\d{1,2})\s+([A-Z][^\n]{3,140})$/;          // « 1 Understanding … » ou « Chapter 1 … »
const H2 = /^(\d{1,2})\.(\d{1,2})\s+([A-Z][^\n]{2,140})$/;              // « 1.1 The Nature of Business »
const STOP = /^(References|Bibliography|Index)$/;

const chapterTitles = {};
// Secours : titres transmis par le Cleaning (lus dans les en-têtes courants « Chapter N … »),
// pour les chapitres dont l'OCR n'a pas sorti de titre #.
const fallbackTitles = $input.first().json.chapter_titles || {};
const chapterParts = $input.first().json.chapter_parts || {};   // « Part I: Wealth » (livres structurés par sommaire)
let STRUCTURE = $input.first().json.structure || 'numérotée';
let last = [0, 0];
let stopped = false;
const sections = [];
let cur = null;

const isNextSection = (c, s) =>
  (c === last[0] && (s === last[1] + 1 || s === last[1] + 2)) ||
  (c === last[0] + 1 && (s === 0 || s === 1)) ||
  (last[0] === 0 && c === 1 && (s === 0 || s === 1));

for (let i = 0; i < lines.length && !stopped; i++) {
  const raw = lines[i];
  const isHeading = /^#{1,6}\s/.test(raw);
  const t = clean(raw);

  if (isHeading && STOP.test(t) && last[0] >= 1) { stopped = true; break; }

  if (isHeading) {
    let m = t.match(H2);
    if (m && !/\s\d{1,4}$/.test(t) && isNextSection(+m[1], +m[2])) {
      if (cur) sections.push(cur);
      last = [+m[1], +m[2]];
      cur = { chapter: +m[1], section: `${m[1]}.${m[2]}`, section_title: m[3].trim(), lines: [] };
      continue;
    }
    m = t.match(H1);
    if (m && (+m[1] === last[0] + 1 || +m[1] === last[0]) && !chapterTitles[m[1]]) {
      chapterTitles[m[1]] = m[2].replace(/\s+\d{1,4}$/, '').trim();
      continue; // le titre de chapitre ne crée pas de section : la 1re section suit
    }
    const ap = t.match(/^Appendix ([A-Z])\b\s*[|:]?\s*(.*)$/i);
    if (ap && last[0] >= 1) {
      const L = ap[1].toUpperCase();
      if (cur && cur.section === L) continue;     // en-tête courant répété sur chaque page de l'annexe
      if (cur) sections.push(cur);
      cur = { chapter: L, section: L, section_title: ap[2].trim() || `Appendix ${L}`, lines: [] };
      continue;
    }
  }
  if (cur && !/^\s*---\s*$/.test(raw)) cur.lines.push({ line: raw, page: linePage[i] });
}
if (cur) sections.push(cur);

// Secours : aucun titre repérable (roman, essai…) → tout le livre en une pseudo-section « p »,
// découpée par le Recursive Character Text Splitter ; chaque chunk garde sa page de début.
if (!sections.length) {
  const all = lines.map((line, i) => ({ line, page: linePage[i] })).filter(l => !/^\s*---\s*$/.test(l.line));
  sections.push({ chapter: '', section: 'p', section_title: '', lines: all });
  STRUCTURE = 'pages';
}

// ---------- 3. Recursive Character Text Splitter (même algorithme que LangChain / n8n) ----------
// On essaie les séparateurs du plus « gros » au plus fin : ## → ### → paragraphe → ligne → phrase → mot.
// On ne coupe jamais au milieu d'un mot tant qu'un séparateur plus gros suffit.
function splitRecursive(text, seps) {
  if (text.length <= CHUNK_SIZE) return [text];
  const sep = seps.find(s => s === '' || text.includes(s));
  const rest = seps.slice(seps.indexOf(sep) + 1);
  const parts = sep === ''
    ? Array.from({ length: Math.ceil(text.length / CHUNK_SIZE) }, (_, k) => text.slice(k * CHUNK_SIZE, (k + 1) * CHUNK_SIZE))
    : text.split(sep).map((p, k) => (k === 0 ? p : sep + p));
  const out = [];
  let buf = '';
  for (const p of parts) {
    if (p.length > CHUNK_SIZE) {
      if (buf) { out.push(buf); buf = ''; }
      out.push(...splitRecursive(p, rest));
    } else if ((buf + p).length > CHUNK_SIZE) {
      out.push(buf);
      buf = CHUNK_OVERLAP > 0 ? buf.slice(-CHUNK_OVERLAP) + p : p;   // slice(-0) renverrait tout : on l'évite
      if (buf.length > CHUNK_SIZE) buf = p;
    } else {
      buf += p;
    }
  }
  if (buf.trim()) out.push(buf);
  return out.filter(c => c.trim());
}

// ---------- 4. Un item par chunk ----------
const items = [];
const nextIndex = {};   // compteur par section sur tout le livre → chunk_id toujours unique
for (const s of sections) {
  const text = s.lines.map(l => l.line).join('\n').trim();
  if (!text) continue;
  const chunks = splitRecursive(text, SEPARATORS);
  let offset = 0, cursor = 0;   // cursor : on cherche le chunk suivant APRÈS le précédent (les chunks se suivent)
  chunks.forEach((c, idx) => {
    // page du début du chunk : on cherche la ligne correspondante
    const pos = text.indexOf(c.slice(0, 80), Math.max(0, cursor - CHUNK_OVERLAP));
    if (pos >= 0) { offset = pos + (c.length - c.trimStart().length); cursor = pos + Math.max(1, c.length - 200); }   // page du 1er caractère non vide
    let acc = 0, p = s.lines.length ? s.lines[0].page : 1;
    for (const l of s.lines) { if (acc + l.line.length + 1 > offset) { p = l.page; break; } acc += l.line.length + 1; }
    items.push({
      json: {
        text: c,
        chapter: s.chapter,
        chapter_title: /^[A-Z]$/.test(String(s.chapter)) ? `Appendix ${s.chapter}` : (chapterTitles[s.chapter] || fallbackTitles[s.chapter] || ''),
        part: chapterParts[s.chapter] || '',
        section: s.section,
        section_title: s.section_title,
        structure: STRUCTURE,
        page: p,
        chunk_index: (nextIndex[s.section] = (nextIndex[s.section] ?? -1) + 1),
      },
    });
  });
}

if (!items.length) {
  throw new Error("Aucun texte exploitable : le PDF est peut-être scanné (images sans texte). Vérifie la sortie du nœud « Extraction ».");
}
return items;
