# Configuration Gmail SMTP pour l'Edge Function

## Étape 1 : Créer un mot de passe d'application Gmail

1. **Allez sur votre compte Google** : https://myaccount.google.com/

2. **Activez la validation en 2 étapes** (si ce n'est pas déjà fait) :
   - Allez dans "Sécurité"
   - Activez "Validation en deux étapes"

3. **Créez un mot de passe d'application** :
   - Allez dans "Sécurité" → "Validation en deux étapes"
   - Faites défiler jusqu'à "Mots de passe des applications"
   - Cliquez sur "Mots de passe des applications"
   - Sélectionnez "Autre (nom personnalisé)"
   - Nommez-le : **"Eficia Credits Boost"**
   - Cliquez sur "Générer"
   - **Copiez le mot de passe de 16 caractères** (format : xxxx xxxx xxxx xxxx)

## Étape 2 : Configurer les variables d'environnement dans Supabase

1. **Allez dans votre Dashboard Supabase** :
   - https://supabase.com/dashboard

2. **Sélectionnez votre projet** "eficia-credits-boost"

3. **Allez dans Edge Functions** :
   - Cliquez sur "Edge Functions" dans le menu
   - Cliquez sur "notify-admin-new-job"

4. **Ajoutez les secrets** (onglet "Secrets" ou "Settings") :
   - Nom : `GMAIL_USER`
     Valeur : `g.darroux@gmail.com`

   - Nom : `GMAIL_APP_PASSWORD`
     Valeur : `<le mot de passe de 16 caractères sans espaces>`
     Exemple : `xxxxyyyyzzzzaaaa`

## Étape 3 : Redéployer la fonction

1. **Dans Supabase Dashboard** :
   - Edge Functions → notify-admin-new-job
   - Copiez le contenu du fichier `index.ts` mis à jour
   - Collez dans l'éditeur
   - Cliquez sur "Deploy"

## Étape 4 : Tester

1. Uploadez un fichier depuis le dashboard utilisateur
2. Vérifiez que vous recevez un email sur `g.darroux@gmail.com`
3. Vérifiez les logs de la fonction Edge dans Supabase

## Notes importantes

- Le mot de passe d'application Gmail est différent de votre mot de passe Gmail normal
- Il a un format de 16 caractères générés automatiquement
- Il est valide uniquement pour cette application
- Vous pouvez le révoquer à tout moment depuis votre compte Google
- Enregistrez-le dans un endroit sûr (gestionnaire de mots de passe)

## Sécurité

Les secrets sont stockés de manière sécurisée dans Supabase et ne sont jamais exposés côté client.
