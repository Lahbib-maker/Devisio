import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
})

export const PLANS = {
  gratuit: {
    name: 'Gratuit',
    price: 0,
    priceId: null,
    features: [
      '3 devis IA par mois',
      'PDF téléchargeable',
      'Mentions légales incluses',
    ],
    limit: 3,
  },
  solo: {
    name: 'Solo',
    price: 19,
    priceId: process.env.STRIPE_PRICE_SOLO,
    features: [
      'Devis IA illimités',
      'PDF conforme légalement',
      'Envoi email au client',
      'Gestion des statuts',
      'Profil artisan complet',
    ],
    limit: null,
  },
  pro: {
    name: 'Pro',
    price: 39,
    priceId: process.env.STRIPE_PRICE_PRO,
    features: [
      'Tout Solo +',
      'Relances automatiques',
      'Statistiques avancées',
      'Multi-utilisateurs (2)',
      'Support prioritaire',
    ],
    limit: null,
  },
}
