# Actions de déploiement - Corrections critiques

## 1. Fusionner billing_profiles dans profiles (PRIORITAIRE)

### Raison
La séparation de `billing_profiles` et `profiles` cause des erreurs RLS sans aucun bénéfice architectural. Tout fusionner simplifie le schéma et élimine les conflits.

### Action dans Supabase SQL Editor
Exécutez le fichier : [MERGE_BILLING_INTO_PROFILES.sql](supabase/migrations/MERGE_BILLING_INTO_PROFILES.sql)

```sql
-- Ce script va :
-- 1. Ajouter les colonnes billing à la table profiles
-- 2. Migrer les données existantes (si il y en a)
-- 3. Supprimer la table billing_profiles
-- 4. Mettre à jour le trigger handle_new_user
```

### Résultat
- ✅ Plus d'erreur RLS au signup
- ✅ Schéma simplifié
- ✅ Requêtes plus simples (plus de JOIN)
- ✅ Trigger fonctionne sans conflit

---

## 2. Corriger le webhook Stripe (CRITIQUE)

### Problème
Les crédits ne s'ajoutent pas après paiement car le webhook créé seulement une transaction mais ne met PAS À JOUR le balance.

### Action
Redéployer la fonction `stripe-webhook` :

1. Dashboard Supabase → Edge Functions → `stripe-webhook`
2. Copiez le contenu de [stripe-webhook/index_FIXED.ts](supabase/functions/stripe-webhook/index_FIXED.ts)
3. Déployez

**OU** via CLI :
```bash
supabase functions deploy stripe-webhook
```

### Changements clés dans le code fixé
- Ligne 75 : SELECT `id, balance` (récupère le solde actuel)
- Ligne 87 : INSERT avec `balance: creditsAmount` (bon solde initial)
- Ligne 117-122 : **UPDATE du balance** après paiement (CRITIQUE!)

---

## 3. Vérifier le déploiement de notify-user-job-completed

### Vérifier si déjà déployé
Dashboard Supabase → Edge Functions → cherchez `notify-user-job-completed`

### Si pas déployé
```bash
supabase functions deploy notify-user-job-completed
```

### Variables d'environnement requises
Vérifiez que ces variables sont configurées dans Supabase :
- `GMAIL_USER` = g.darroux@gmail.com
- `GMAIL_APP_PASSWORD` = Votre App Password Gmail
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 4. Tests après déploiement

### Test 1 : Signup (billing_profiles mergé)
1. Créez un nouveau compte utilisateur
2. Remplissez toutes les informations (nom, email, billing)
3. Vérifiez dans Supabase :
   - Table `profiles` → La ligne existe avec toutes les infos billing
   - Table `credit_accounts` → Ligne créée avec `balance = 0`
4. ✅ Plus d'erreur RLS !

### Test 2 : Achat de crédits (webhook fixé)
1. Connectez-vous avec un compte test
2. Achetez un pack de crédits (mode test Stripe)
3. Complétez le paiement
4. Vérifiez dans Supabase :
   - Table `credit_accounts` → Le `balance` est mis à jour avec les crédits
   - Table `credit_transactions` → Une ligne est créée
5. Dashboard utilisateur → Les crédits apparaissent

### Test 3 : Notification job complété
1. Admin marque un job comme "Completed"
2. Vérifiez que l'utilisateur reçoit un email
3. Email contient :
   - Nom du fichier
   - Nombre de lignes enrichies
   - Crédits utilisés
   - Lien vers le dashboard

---

## 5. Ordre d'exécution recommandé

1. **D'ABORD** : Exécutez `MERGE_BILLING_INTO_PROFILES.sql` (règle le signup)
2. **ENSUITE** : Redéployez `stripe-webhook` avec index_FIXED.ts (règle les paiements)
3. **VÉRIFIEZ** : `notify-user-job-completed` est déployé
4. **TESTEZ** : Créez un compte, achetez des crédits, testez un job complet

---

## 6. Logs à surveiller

### Stripe webhook
Dashboard Supabase → Edge Functions → `stripe-webhook` → Logs

Recherchez :
```
[STRIPE-WEBHOOK] Balance updated - {"oldBalance":0,"newBalance":100}
```

### User notification
Dashboard Supabase → Edge Functions → `notify-user-job-completed` → Logs

Recherchez :
```
Email sent successfully to: user@email.com
```

---

## 7. Rollback en cas de problème

### Si problème avec la fusion billing_profiles

La fusion est **définitive** (la table billing_profiles est supprimée). Si vraiment nécessaire :

1. Recréez la table billing_profiles avec le schéma d'origine
2. Réexécutez `FIX_BILLING_PROFILE_TRIGGER.sql`
3. Mais vous aurez toujours le problème RLS...

**Recommandation** : Ne pas rollback, la fusion est la bonne solution.

### Si problème avec le webhook Stripe

1. Dashboard Supabase → Edge Functions → `stripe-webhook`
2. Recopiez l'ancien code (index.ts sans les fixes)
3. Déployez

Mais vous aurez toujours le bug des crédits qui ne s'ajoutent pas.

---

## Résumé des fichiers modifiés

- ✅ [MERGE_BILLING_INTO_PROFILES.sql](supabase/migrations/MERGE_BILLING_INTO_PROFILES.sql) - Migration SQL
- ✅ [stripe-webhook/index_FIXED.ts](supabase/functions/stripe-webhook/index_FIXED.ts) - Webhook corrigé
- ✅ [src/lib/supabase.ts](src/lib/supabase.ts) - Interface Profile mise à jour
- ✅ [src/pages/SignUp.tsx](src/pages/SignUp.tsx) - Utilise profiles au lieu de billing_profiles
- ✅ [notify-user-job-completed/index.ts](supabase/functions/notify-user-job-completed/index.ts) - Déjà créé

---

## Contact en cas de problème

Si les tests échouent après déploiement :
1. Consultez les logs Supabase
2. Vérifiez les variables d'environnement
3. Testez avec le mode Stripe test (pas production)
