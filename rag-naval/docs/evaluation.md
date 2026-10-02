# Évaluation du chatbot

Le workflow `3-evaluation` envoie ces 16 questions au chat public, une toutes les 15 secondes, puis calcule le score.
Une réponse est **bonne** si elle ne refuse pas et si sa ligne de sources cite l'une des sections attendues. Une question hors sujet est **bonne** si elle est refusée.

Objectifs : au moins 80 % de bonnes réponses sur les 12 questions livre + vie réelle, et 3 refus sur 3.

| # | Type | Question | Section attendue | Résultat |
|---|---|---|---|---|
| L1 | livre | C'est quoi le savoir spécifique selon Naval ? | Find and Build Specific Knowledge |✅ |
| S1 | suivi | Et comment on le développe concrètement ? | Find and Build Specific Knowledge, Find Work That Feels Like Play |✅ |
| L2 | livre | Quels sont les différents types de levier dont parle Naval ? | Find a Position of Leverage |✅ |
| L3 | livre | Pourquoi faut-il jouer des jeux à long terme avec des gens fiables ? | Play Long-Term Games with Long-Term People |✅ |
| L4 | livre | Comment Naval définit-il la chance, et comment la provoquer ? | How to Get Lucky |✅ |
| L5 | livre | Pourquoi faut-il posséder des parts d'une entreprise pour devenir riche ? | Build or Buy Equity in a Business, Understand How Wealth Is Created |✅ |
| L6 | livre | Comment prendre de meilleures décisions selon Naval ? | Learn the Skills of Decision-Making, Judgment, Collect Mental Models, How to Think Clearly |✅ |
| L7 | livre | Pourquoi Naval conseille-t-il de lire autant ? | Learn to Love to Read |✅ |
| L8 | livre | Le bonheur est-il une compétence qui s'apprend ? | Happiness Is Learned, Happiness Is a Choice, Learning Happiness |✅ |
| L9 | livre | Pourquoi Naval dit-il que chaque désir rend malheureux ? | Every Desire Is a Chosen Unhappiness |✅ |
| L10 | livre | Quel rôle joue la méditation dans la vie de Naval ? | Meditation + Mental Strength |✅ |
| R1 | vie réelle | Je bosse 60 h par semaine et je ne deviens pas riche, je fais quoi ? | Understand How Wealth Is Created, Find a Position of Leverage, Build or Buy Equity in a Business, Get Paid for Your Judgment, Building Wealth |✅ |
| R2 | vie réelle | Je compare tout le temps ma vie à celle des autres, comment arrêter ? | Envy Is the Enemy of Happiness, Success Does Not Earn Happiness, Learning Happiness |✅ |
| H1 | hors sujet | Donne-moi la recette des crêpes bretonnes. | refus |✅ refusée |
| H2 | hors sujet | Qui a gagné la Coupe du monde de football 2018 ? | refus |✅ refusée |
| H3 | hors sujet | Écris-moi un poème sur la mer. | refus |✅ refusée |

## Résultats

Dernier run (2 octobre 2026), avec les prompts XML et gemini-flash-lite-latest, livre entièrement indexé (82 chunks) :

| Questions livre | Vie réelle | Suivi (mémoire) | Refus hors sujet |
|---|---|---|---|
| 10/10 | 2/2 | 1/1 | 3/3 |

Les deux objectifs sont atteints. Chaque réponse cite au moins une section attendue ; les trois questions hors sujet reçoivent le message de refus.

Ce même jeu de test a servi à valider le passage aux prompts XML : un premier run est tombé à 12/16 parce que la réflexion du modèle consommait le budget de tokens et coupait la ligne de sources. Après correction (budget relevé, titre « Specific » réparé dans la base), retour à 16/16.
