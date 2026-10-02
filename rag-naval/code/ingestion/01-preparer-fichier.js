// ===== Préparer le fichier =====
// Le formulaire nomme la pièce jointe d'après le libellé du champ.
// On la renomme en « data » pour que l'étape Extraction la trouve toujours,
// et on calcule l'identifiant du livre (book_id) à partir de son titre :
// minuscules, sans accents ni ponctuation, sans ce qui est entre parenthèses.
// « Introduction to Business (OpenStax, CC BY 4.0) » → introduction-to-business
// Le book_id préfixe chaque chunk_id : deux livres ne peuvent plus se marcher dessus,
// et redéposer le même livre (même titre) reprend l'indexation là où elle s'était arrêtée.
const item = $input.first();
const keys = Object.keys(item.binary || {});
if (!keys.length) throw new Error('Aucun PDF reçu depuis le formulaire.');
const file = item.binary[keys[0]];

const title = String(item.json['Titre du livre'] ?? '').replace(/\s+/g, ' ').trim();
if (!title) throw new Error('Indique le titre du livre dans le formulaire.');
const bookId = title
  .replace(/\(.*?\)/g, ' ')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  .slice(0, 40).replace(/-+$/, '');
if (!bookId) throw new Error(`Titre de livre inutilisable : « ${title} ».`);

return [{ json: { file_name: file.fileName || 'livre.pdf', book_title: title, book_id: bookId }, binary: { data: file } }];
