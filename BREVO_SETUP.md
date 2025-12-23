# Migration vers Brevo (Sendinblue) pour les emails

## ✅ Modifications effectuées

La fonction `complete-signup` a été migrée de Gmail SMTP vers Brevo API.

### Avantages de Brevo
- ✅ Pas de limite stricte (500 emails/jour sur Gmail)
- ✅ Meilleure délivrabilité (moins de spam)
- ✅ API REST simple
- ✅ Suivi des emails (ouvertures, clics)
- ✅ Gratuit jusqu'à 300 emails/jour

---

## 📋 Configuration Brevo

### 1. Récupérer votre clé API Brevo

1. Connectez-vous sur https://app.brevo.com
2. Allez dans **Settings** → **SMTP & API** → **API Keys**
3. Créez une nouvelle clé API (ou utilisez une existante)
4. Copiez la clé (format: `xkeysib-xxx...`)

### 2. Configurer le secret Supabase

Ajoutez la clé API comme secret Supabase :

```bash
# Via Supabase CLI
supabase secrets set BREVO_API_KEY=xkeysib-votre-cle-ici

# Ou via le Dashboard Supabase
# Edge Functions → Settings → Secrets
# Ajouter: BREVO_API_KEY = xkeysib-votre-cle-ici
```

### 3. Déployer la fonction mise à jour

```bash
# Déployer complete-signup avec le helper Brevo
supabase functions deploy complete-signup

# Vérifier les logs
supabase functions logs complete-signup --tail
```

---

## 🧪 Tester l'envoi d'email

### Test depuis l'interface Supabase

Allez dans **Edge Functions** → **complete-signup** → **Invoke**

Body de test :
```json
{
  "email": "votre-email@test.com",
  "password": "TestPassword123!",
  "phone": "+33612345678"
}
```

Vérifiez :
1. ✅ Logs : "✅ Email sent successfully via Brevo"
2. ✅ Boîte mail : Email de bienvenue reçu
3. ✅ Brevo Dashboard : Email visible dans les statistiques

---

## 🔧 Configuration de l'expéditeur (Sender)

### Option 1 : Utiliser un domaine vérifié (Recommandé)

1. Dans Brevo, allez dans **Settings** → **Senders & IP**
2. Ajoutez votre domaine `eficia.com`
3. Vérifiez le domaine (records DNS SPF, DKIM)
4. Mettez à jour le helper Brevo :

```typescript
fromEmail: "noreply@eficia.com", // ✅ Domaine vérifié
fromName: "Eficia",
```

### Option 2 : Utiliser un email Brevo (par défaut)

Si vous n'avez pas de domaine vérifié, Brevo fournit un email par défaut :

```typescript
fromEmail: "contact@your-brevo-domain.com",
fromName: "Eficia",
```

---

## 📊 Monitoring

### Vérifier les envois dans Brevo

1. **Dashboard Brevo** → **Statistics** → **Email**
2. Voir les emails envoyés, taux d'ouverture, etc.

### Vérifier les logs Supabase

```bash
# En temps réel
supabase functions logs complete-signup --tail

# Historique
supabase functions logs complete-signup
```

---

## ⚠️ Limites Brevo (Plan gratuit)

- **300 emails/jour** (largement suffisant pour démarrer)
- Si vous dépassez : upgrade vers plan payant (~25€/mois pour 20k emails)

---

## 🔄 Prochaines étapes (optionnel)

Une fois que `complete-signup` fonctionne avec Brevo, migrer les autres fonctions :

1. ✅ `complete-signup` (déjà fait)
2. ⏳ `notify-admin-new-job`
3. ⏳ `notify-user-job-completed`

Même process pour chaque fonction :
- Supprimer l'import `SMTPClient`
- Importer `sendEmail` depuis `../_shared/brevo.ts`
- Remplacer le code SMTP par `sendEmail(...)`

---

## 🐛 Troubleshooting

### Erreur "BREVO_API_KEY is not configured"

```bash
# Vérifier que le secret existe
supabase secrets list

# Redéployer la fonction
supabase functions deploy complete-signup
```

### Erreur 401 "Unauthorized"

- Vérifiez que votre clé API Brevo est valide
- Vérifiez qu'elle a les permissions "Send emails"

### Email non reçu

- Vérifiez les **logs Supabase** : erreur API ?
- Vérifiez **Brevo Dashboard** : email envoyé ?
- Vérifiez votre **dossier spam**
- Vérifiez que l'email expéditeur est **vérifié** dans Brevo

---

## 📚 Documentation Brevo

- API Reference : https://developers.brevo.com/reference/sendtransacemail
- Dashboard : https://app.brevo.com
- Support : https://help.brevo.com
