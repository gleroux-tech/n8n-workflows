// ===== Étape AUGMENTATION (métadonnées) =====
// Code node, mode "Run Once for All Items"
// Ajoute à chaque chunk un en-tête lisible (utile pour l'embedding et la citation)
// et les métadonnées qui seront stockées dans Supabase.
// Le titre et l'identifiant du livre viennent du formulaire (nœud « Préparer le fichier »).

const prep = $('Préparer le fichier').first().json;
const BOOK = prep.book_title;
const BOOK_ID = prep.book_id;

return $input.all().map((item, i) => {
  const j = item.json;
  const isAppendix = /^[A-Z]$/.test(String(j.chapter));
  const parts = [BOOK];
  if (j.structure === 'sommaire') {
    // Livre sans numéros : on cite les titres du livre (« Part I: Wealth › Building Wealth | How to Get Lucky »)
    parts.push([j.part, j.chapter_title].filter(Boolean).join(' › '));
    if (j.section && !/\.0$/.test(j.section)) parts.push(j.section_title);
  } else if (isAppendix) parts.push(`Appendix ${j.chapter}`);
  else if (j.chapter !== '' && j.chapter != null) parts.push(`Chapter ${j.chapter}${j.chapter_title ? ' — ' + j.chapter_title : ''}`);
  if (j.structure !== 'sommaire' && j.section && j.section !== 'p') parts.push(`Section ${j.section} — ${j.section_title}`);
  parts.push(`p. ${j.page}`);
  const header = `[${parts.join(' | ')}]`;

  return {
    json: {
      content: `${header}\n${j.text}`,
      book: BOOK,
      book_id: BOOK_ID,
      part: j.part ?? '',
      chapter: String(j.chapter ?? ''),
      chapter_title: j.chapter_title ?? '',
      section: String(j.section ?? ''),
      section_title: j.section_title ?? '',
      structure: j.structure ?? 'numérotée',
      page: String(j.page),
      chunk_id: `${BOOK_ID}:${j.section}-${j.chunk_index}`,
      global_index: String(i),
    },
  };
});
