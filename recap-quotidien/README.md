# Récap quotidien · Telegram

Chaque matin à 7 h 30, un récap Telegram des rendez-vous du jour et des mails qui attendent une réponse, sur trois comptes Google (perso, école, pro).
Chaque rendez-vous et chaque mail arrive avec un bouton : décliner l'invitation, ou marquer le mail « pas important » pour que le tri en tienne compte dès le lendemain.

| Workflow | Déclencheur | Rôle |
|---|---|---|
| `1-recap-matinal.json` | Tous les jours, 7 h 30 | Lit 3 Gmail et 3 Google Agenda, repère les conflits, trie les mails avec un LLM, envoie le récap et les messages à boutons |
| `2-actions-boutons.json` | Clic Telegram | Décline une invitation (ou annule le refus) dans le bon agenda, ou retient un mail « pas important » |
| `3-signal-de-vie.json` | 7 h 45 + workflow d'erreur | Alerte si aucun récap n'est parti, ou si un des deux autres workflows échoue ; repli par mail si Telegram ne répond pas |

## Mise en place

1. Importer les 3 workflows et recréer les credentials : 3 Gmail, 3 Google Agenda, OpenAI, Telegram.
2. Remplacer `TON_CHAT_ID_TELEGRAM` et les adresses `ton.adresse…` par les vraies valeurs.
3. Créer 4 Data Tables dans n8n : `recap_runs`, `recap_mails_en_attente`, `recap_feedback`, `recap_boutons` (colonnes visibles dans les nœuds qui les utilisent).
4. Dans les réglages des workflows 1 et 2, choisir `3-signal-de-vie` comme workflow d'erreur.

Spec complète et critères d'acceptation : [gleroux-tech/recap-quotidien-n8n](https://github.com/gleroux-tech/recap-quotidien-n8n).
