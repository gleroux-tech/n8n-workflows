// ===== Jeu de test =====
// Code node, mode "Run Once for All Items"
// 16 appels au chatbot :
//  - 10 questions « livre »        → réponse attendue, qui cite une des sections listées dans `attendu`
//  - 2 questions « vie réelle »    → idem, formulées sans le vocabulaire du livre
//  - 1 question de suivi           → même session que la première (teste la mémoire)
//  - 3 questions hors sujet        → refus attendu
// Les sessions sont préfixées par l'heure du run pour ne pas hériter de l'historique d'un run précédent.

const run = `eval-${Date.now()}`;
const cases = [
  { id: 'L1',  kind: 'livre',      question: "C'est quoi le savoir spécifique selon Naval ?", attendu: ['Find and Build Specific Knowledge'], session: 'suivi' },
  { id: 'S1',  kind: 'suivi',      question: 'Et comment on le développe concrètement ?', attendu: ['Find and Build Specific Knowledge', 'Find Work That Feels Like Play'], session: 'suivi' },
  { id: 'L2',  kind: 'livre',      question: 'Quels sont les différents types de levier dont parle Naval ?', attendu: ['Find a Position of Leverage'] },
  { id: 'L3',  kind: 'livre',      question: 'Pourquoi faut-il jouer des jeux à long terme avec des gens fiables ?', attendu: ['Play Long-Term Games with Long-Term People'] },
  { id: 'L4',  kind: 'livre',      question: 'Comment Naval définit-il la chance, et comment la provoquer ?', attendu: ['How to Get Lucky'] },
  { id: 'L5',  kind: 'livre',      question: "Pourquoi faut-il posséder des parts d'une entreprise pour devenir riche ?", attendu: ['Build or Buy Equity in a Business', 'Understand How Wealth Is Created'] },
  { id: 'L6',  kind: 'livre',      question: 'Comment prendre de meilleures décisions selon Naval ?', attendu: ['Learn the Skills of Decision-Making', 'Judgment', 'Collect Mental Models', 'How to Think Clearly'] },
  { id: 'L7',  kind: 'livre',      question: 'Pourquoi Naval conseille-t-il de lire autant ?', attendu: ['Learn to Love to Read'] },
  { id: 'L8',  kind: 'livre',      question: "Le bonheur est-il une compétence qui s'apprend ?", attendu: ['Happiness Is Learned', 'Happiness Is a Choice', 'Learning Happiness'] },
  { id: 'L9',  kind: 'livre',      question: 'Pourquoi Naval dit-il que chaque désir rend malheureux ?', attendu: ['Every Desire Is a Chosen Unhappiness'] },
  { id: 'L10', kind: 'livre',      question: 'Quel rôle joue la méditation dans la vie de Naval ?', attendu: ['Meditation + Mental Strength'] },
  { id: 'R1',  kind: 'vie réelle', question: 'Je bosse 60 h par semaine et je ne deviens pas riche, je fais quoi ?', attendu: ['Understand How Wealth Is Created', 'Find a Position of Leverage', 'Build or Buy Equity in a Business', 'Get Paid for Your Judgment', 'Building Wealth'] },
  { id: 'R2',  kind: 'vie réelle', question: 'Je compare tout le temps ma vie à celle des autres, comment arrêter ?', attendu: ['Envy Is the Enemy of Happiness', 'Success Does Not Earn Happiness', 'Learning Happiness'] },
  { id: 'H1',  kind: 'hors sujet', question: 'Donne-moi la recette des crêpes bretonnes.', refuse: true },
  { id: 'H2',  kind: 'hors sujet', question: 'Qui a gagné la Coupe du monde de football 2018 ?', refuse: true },
  { id: 'H3',  kind: 'hors sujet', question: 'Écris-moi un poème sur la mer.', refuse: true },
];

return cases.map(c => ({
  json: {
    ...c,
    refuse: Boolean(c.refuse),
    attendu: c.attendu || [],
    sessionId: `${run}-${c.session || c.id}`,
  },
}));
