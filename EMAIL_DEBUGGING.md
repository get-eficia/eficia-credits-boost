# 🔍 Débogage des Emails de Bienvenue

## Problème constaté
Les emails de bienvenue sont envoyés (visibles dans "Messages envoyés" Gmail) mais n'arrivent pas dans la boîte de réception du destinataire.

## Causes possibles

### 1. **Spam / Filtres Gmail**
Les emails automatisés sont souvent classés comme spam par Gmail, surtout s'ils :
- Contiennent beaucoup d'HTML/CSS
- Utilisent des emojis dans le sujet
- Proviennent d'un compte Gmail personnel (et non d'un domaine dédié)

### 2. **SPF, DKIM, DMARC non configurés**
Gmail vérifie ces enregistrements DNS pour valider l'authenticité de l'expéditeur.

## Solutions recommandées

### Solution 1: Vérifier les dossiers Spam
Demandez au destinataire de vérifier :
- Dossier Spam/Courrier indésirable
- Onglet "Promotions" (Gmail)
- Onglet "Mises à jour" (Gmail)

### Solution 2: Simplifier l'email HTML
Réduire la complexité de l'HTML peut améliorer la délivrabilité :

```typescript
// Dans complete-signup/index.ts, remplacer l'email HTML par une version plus simple
const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #8B5CF6;">Welcome to Eficia!</h1>

  <p>Hello,</p>

  <p>Thank you for creating an account with Eficia Credits Boost!</p>

  <p>Your account is ready to use. Click the link below to access your dashboard:</p>

  <p style="text-align: center; margin: 30px 0;">
    <a href="${loginUrl}" style="background: #8B5CF6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
      Access Your Dashboard
    </a>
  </p>

  <p><strong>Your Account Details:</strong><br>
  Email: ${signupData.email}</p>

  <p><strong>What's next?</strong></p>
  <ul>
    <li>Purchase credits to start enriching your data</li>
    <li>Upload your CSV or Excel file with contact information</li>
    <li>Get enriched results within 24 hours maximum</li>
  </ul>

  <p>Best regards,<br>The Eficia Team</p>

  <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
  <p style="color: #666; font-size: 12px; text-align: center;">
    © ${new Date().getFullYear()} Eficia. All rights reserved.
  </p>
</body>
</html>
`;
```

### Solution 3: Modifier le sujet de l'email
Retirer les emojis du sujet peut améliorer la délivrabilité :

```typescript
await smtpClient.send({
  from: `Eficia Credits Boost <${gmailUser}>`,
  to: signupData.email,
  subject: "Welcome to Eficia Credits Boost!", // Sans emoji
  content: "auto",
  html: emailHtml,
});
```

### Solution 4: Utiliser un service d'emailing dédié (Recommandé)
Pour une meilleure délivrabilité en production, utilisez un service professionnel :

#### **Option A: SendGrid** (Gratuit jusqu'à 100 emails/jour)
```typescript
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const smtpClient = new SMTPClient({
  connection: {
    hostname: "smtp.sendgrid.net",
    port: 465,
    tls: true,
    auth: {
      username: "apikey",
      password: Deno.env.get("SENDGRID_API_KEY"),
    },
  },
});
```

#### **Option B: Resend** (API moderne, 100 emails/jour gratuits)
```typescript
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: "Eficia <hello@eficia.com>", // Nécessite un domaine vérifié
    to: signupData.email,
    subject: "Welcome to Eficia Credits Boost!",
    html: emailHtml,
  }),
});
```

### Solution 5: Ajouter un fallback text-only
Ajouter une version texte de l'email améliore la délivrabilité :

```typescript
await smtpClient.send({
  from: `Eficia Credits Boost <${gmailUser}>`,
  to: signupData.email,
  subject: "Welcome to Eficia Credits Boost!",
  content: "auto",
  html: emailHtml,
  text: `
Hello,

Thank you for creating an account with Eficia Credits Boost!

Your account is ready to use. Visit ${loginUrl} to access your dashboard.

Email: ${signupData.email}

What's next?
- Purchase credits to start enriching your data
- Upload your CSV or Excel file with contact information
- Get enriched results within 24 hours maximum

Best regards,
The Eficia Team
  `.trim(),
});
```

## Test rapide
Pour vérifier que l'envoi fonctionne, ajoutez un log dans la fonction :

```typescript
console.log("📧 Email sent to:", signupData.email);
console.log("📨 From:", gmailUser);
console.log("✅ SMTP connection successful");
```

Puis vérifiez les logs dans Supabase :
```bash
supabase functions logs complete-signup --project-ref YOUR_PROJECT_REF
```

## Checklist de débogage
- [ ] Vérifier les logs de la fonction Edge
- [ ] Vérifier le dossier Spam du destinataire
- [ ] Tester avec un email différent (pas Gmail)
- [ ] Simplifier le HTML de l'email
- [ ] Retirer les emojis du sujet
- [ ] Ajouter une version texte
- [ ] Considérer un service d'emailing dédié (SendGrid, Resend, etc.)
