# Déploiement de la fonction notify-user-job-completed

Cette Edge Function envoie un email à l'utilisateur lorsque son job d'enrichissement est marqué comme "Completed" par l'admin.

## Prérequis

Les mêmes variables d'environnement que `notify-admin-new-job` :
- `GMAIL_USER` = `g.darroux@gmail.com`
- `GMAIL_APP_PASSWORD` = Votre mot de passe d'application Gmail (16 caractères)

## Déploiement

### Via Supabase Dashboard (Recommandé)

1. **Allez sur** https://supabase.com/dashboard
2. **Sélectionnez** votre projet "eficia-credits-boost"
3. **Cliquez sur** "Edge Functions"
4. **Cliquez sur** "Deploy a new function"
5. **Nom :** `notify-user-job-completed`
6. **Copiez/collez** le contenu du fichier `index.ts`
7. **Ajoutez les secrets** (si pas déjà fait) :
   - `GMAIL_USER` = `g.darroux@gmail.com`
   - `GMAIL_APP_PASSWORD` = `<votre mot de passe d'application>`
8. **Cliquez sur** "Deploy"

## Comment ça fonctionne

1. **L'admin** ouvre un job dans le dashboard admin
2. **L'admin** remplit les informations :
   - Numbers Found
   - Credits to Deduct
   - Google Drive Link
3. **L'admin** change le statut à "Completed"
4. **L'admin** clique sur "Save Changes"
5. **La fonction Edge** est automatiquement appelée
6. **L'utilisateur** reçoit un email de notification avec :
   - Le nom du fichier
   - Le nombre de numéros trouvés
   - Les crédits utilisés
   - Un lien vers le dashboard pour télécharger

## Emails envoyés

L'email contient :
- ✅ Badge "Processing Complete"
- 📊 Résumé des résultats
- 📥 Bouton pour télécharger le fichier enrichi
- Design professionnel avec le branding Eficia

## Test

1. Créez un compte utilisateur test
2. Uploadez un fichier
3. En tant qu'admin, marquez le job comme "Completed"
4. Vérifiez que l'utilisateur reçoit l'email

## Logs

Pour voir les logs de la fonction :
- Supabase Dashboard → Edge Functions → notify-user-job-completed → Logs

## Notes

- La fonction utilise les mêmes credentials Gmail que `notify-admin-new-job`
- L'erreur d'envoi d'email n'empêche pas la sauvegarde du job
- Les logs sont disponibles dans le dashboard Supabase pour le debugging
