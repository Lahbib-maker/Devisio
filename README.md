# 📐 Devios — Logiciel de devis pour artisans

Générez des devis professionnels et légalement conformes en 30 secondes.

## 🚀 Stack technique

- **Frontend** : Next.js 14 (App Router)
- **Base de données** : Supabase (PostgreSQL)
- **Auth** : Supabase Auth
- **IA** : Anthropic Claude Haiku (avec fallback tarifs fixes)
- **Emails** : Resend
- **Paiements** : Stripe
- **Déploiement** : Vercel

## ⚡ Installation rapide

```bash
# 1. Cloner et installer
git clone https://github.com/Lahbib-maker/Devios.git
cd Devios
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env.local
# Remplir les valeurs dans .env.local

# 3. Lancer en développement
npm run dev

# 4. Ouvrir http://localhost:3000
```

## 🗄️ Base de données

1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans SQL Editor
3. Coller et exécuter le contenu de `supabase.sql`

Si vous avez déjà les tables et voulez ajouter les nouvelles colonnes, utilisez `migration.sql`.

## 📦 Déploiement Vercel

```bash
git add .
git commit -m "Devios v1"
git push origin main
```

Puis connecter le repo GitHub à Vercel et ajouter les variables d'environnement.

## 🔑 Variables d'environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Clé publique Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé secrète Supabase |
| `ANTHROPIC_API_KEY` | ⚡ | IA Claude (fallback si absent) |
| `RESEND_API_KEY` | 📧 | Envoi emails PDF |
| `STRIPE_SECRET_KEY` | 💳 | Paiements abonnements |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL de l'app en prod |

## ✨ Fonctionnalités

- ✅ Génération IA + fallback tarifs fixes (8 métiers)
- ✅ PDF légal conforme (15 mentions obligatoires)
- ✅ Logo + couleurs personnalisées par artisan
- ✅ Envoi email avec tracking d'ouverture
- ✅ Page de partage publique `/devis/[id]`
- ✅ Conditions particulières par devis
- ✅ Date de validité personnalisable
- ✅ TVA par ligne
- ✅ Modèles réutilisables
- ✅ Autosave localStorage
- ✅ Numérotation chronologique (DEV-2026-001)
- ✅ Validation SIRET (algorithme Luhn)
- ✅ Conversion devis → facture
- ✅ Acompte 30% automatique
- ✅ Relances clients
- ✅ Export CSV comptable
- ✅ Dashboard analytique (CA mensuel, taux conversion)
- ✅ Bibliothèque de prix personnalisée
- ✅ PWA installable (manifest + service worker)
- ✅ Abonnements Stripe (Gratuit / Solo 19€ / Pro 39€)
- ✅ Rate limiting API
- ✅ Headers sécurité HTTP

## 📄 Pages légales

- `/cgu` — Conditions Générales d'Utilisation
- `/cgv` — Conditions Générales de Vente
- `/mentions-legales` — Mentions légales
- `/confidentialite` — Politique de confidentialité

## 🏗️ Structure

```
artisan-pro/
├── app/
│   ├── page.js              ← App principale
│   ├── layout.js            ← Layout global + SEO
│   ├── api/                 ← Routes API
│   └── devis/[id]/          ← Page publique devis
├── components/
│   ├── DevisIA.js           ← Générateur + PDF
│   ├── DevisList.js         ← Liste + filtres + export
│   ├── ProfilArtisan.js     ← Profil + SIRET + logo
│   ├── Analytics.js         ← Dashboard stats
│   └── ...
├── public/
│   ├── landing.html         ← Landing page
│   ├── cgu.html             ← CGU
│   └── ...
└── supabase.sql             ← Schéma BDD complet
```

## 📝 License

Propriétaire — Tous droits réservés © 2026 Devios
