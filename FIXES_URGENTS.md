# Corrections urgentes

## Problème 1 : Les crédits ne s'ajoutent pas après paiement Stripe

### Cause :
La fonction `stripe-webhook` ne met PAS À JOUR le solde de crédits, elle crée seulement une transaction.

### Solution :
Redéployer la fonction `stripe-webhook` avec le code corrigé de [stripe-webhook/index.ts](supabase/functions/stripe-webhook/index.ts)

**Changements clés** :
1. Ligne 77-78 : Récupère maintenant `id, balance` (pas juste `id`)
2. Ligne 86-90 : Crée le compte avec le bon solde initial
3. Ligne 117-124 : **AJOUT** - Met à jour le `balance` après paiement
4. Les noms de colonnes corrigés : `balance` (pas `balance_credits`)

### Redéploiement :
1. Dashboard Supabase → Edge Functions → `stripe-webhook`
2. Copiez le code mis à jour de [stripe-webhook/index.ts](supabase/functions/stripe-webhook/index.ts)
3. Déployez

---

## Problème 2 : billing_profiles non créé à l'inscription

### Cause :
Les RLS policies bloquent l'INSERT même avec un trigger SECURITY DEFINER. La séparation de `billing_profiles` et `profiles` ne sert à rien et cause seulement des problèmes.

### Solution : FUSIONNER billing_profiles dans profiles
Exécutez ce SQL dans Supabase SQL Editor :

**Fichier à exécuter** : [MERGE_BILLING_INTO_PROFILES.sql](supabase/migrations/MERGE_BILLING_INTO_PROFILES.sql)

Ce script va :
1. Ajouter les colonnes billing (company_name, vat_number, etc.) à la table `profiles`
2. Migrer les données existantes (si il y en a)
3. Supprimer la table `billing_profiles`
4. Mettre à jour le trigger pour ne plus créer de billing_profile

### Avantages :
- ✅ Plus d'erreur RLS au signup
- ✅ Schéma simplifié, plus facile à maintenir
- ✅ Pas de JOIN nécessaires
- ✅ Une seule table pour toutes les infos utilisateur

---

## Test après corrections :

### Test 1 : Achat de crédits
1. Créez un nouveau compte utilisateur
2. Achetez un pack de crédits (mode test Stripe)
3. Vérifiez dans `credit_accounts` que le `balance` est mis à jour
4. Vérifiez dans `credit_transactions` qu'une ligne est créée

### Test 2 : Billing profile (après fusion)
1. Créez un nouveau compte
2. Vérifiez dans `profiles` que la ligne contient les informations billing
3. Vérifiez dans `credit_accounts` qu'une ligne existe avec `balance = 0`

---

## Logs à consulter :

### Pour Stripe :
Dashboard Supabase → Edge Functions → `stripe-webhook` → Logs

### Pour Signup :
Database → Logs (cherchez "handle_new_user")

---

## Si ça ne fonctionne toujours pas :

**Stripe webhook** : Vérifiez que le webhook est configuré dans Stripe Dashboard avec l'URL correcte et l'événement `checkout.session.completed`

**Billing profile** : Si le problème persiste après la fusion, vérifiez les RLS policies sur `profiles`
