'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#F7F4EF', surface: '#FFFFFF', border: '#E2DDD6',
  navy: '#1B2D4F', orange: '#E8650A', orangeL: '#FFF0E6',
  green: '#2D7D46', greenL: '#EBF7EE', text: '#1B2D4F',
  textMid: '#4A5568', textSoft: '#8A8F9A',
}

const PLANS = [
  {
    id: 'gratuit',
    name: 'Gratuit',
    price: 0,
    desc: 'Pour tester Devios',
    features: [
      '3 devis IA par mois',
      'PDF téléchargeable',
      'Mentions légales incluses',
      'Choix du taux de TVA',
    ],
    cta: 'Commencer gratuitement',
    highlight: false,
  },
  {
    id: 'solo',
    name: 'Solo',
    price: 19,
    desc: 'Pour l\'artisan indépendant',
    badge: '🔥 Le plus populaire',
    features: [
      'Devis IA illimités',
      'PDF 100% conforme légalement',
      'Envoi email + PDF au client',
      'Édition complète des devis',
      'Profil artisan complet',
      'Gestion des statuts',
      '14 jours d\'essai gratuit',
    ],
    cta: 'Démarrer l\'essai gratuit',
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 39,
    desc: 'Pour développer son activité',
    features: [
      'Tout Solo +',
      'Relances automatiques clients',
      'Statistiques CA et taux acceptation',
      'Multi-utilisateurs (2 comptes)',
      'Export comptable',
      'Support prioritaire',
      '14 jours d\'essai gratuit',
    ],
    cta: 'Démarrer l\'essai gratuit',
    highlight: false,
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState(null)
  const router = useRouter()

  const handleChoix = async (plan) => {
    if (plan.price === 0) { router.push('/'); return }
    setLoading(plan.id)
    try {
      // En prod : récupérer user depuis session Supabase
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, userId: 'USER_ID', userEmail: 'user@email.com' })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) { alert('Erreur : ' + e.message) }
    finally { setLoading(null) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '0 16px 48px' }}>

      {/* Header */}
      <div style={{ background: C.navy, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
        <span style={{ fontSize: 18 }}>📐</span>
        <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>
          Devis<span style={{ color: C.orange }}>io</span>
        </span>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.navy, lineHeight: 1.2, marginBottom: 8 }}>
          Choisissez votre formule
        </div>
        <div style={{ fontSize: 14, color: C.textMid }}>
          14 jours d'essai gratuit - Sans carte bancaire - Résiliable à tout moment
        </div>
        <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, background: C.greenL, border: `1px solid #86EFAC`, borderRadius: 99, padding: '4px 14px' }}>
          <span style={{ fontSize: 12 }}>✅</span>
          <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>Devis conformes à la loi française</span>
        </div>
      </div>

      {/* Plans */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 480, margin: '0 auto' }}>
        {PLANS.map(plan => (
          <div key={plan.id} style={{
            background: C.surface, borderRadius: 20, overflow: 'hidden',
            border: `${plan.highlight ? 2 : 1}px solid ${plan.highlight ? C.navy : C.border}`,
            boxShadow: plan.highlight ? '0 8px 32px rgba(27,45,79,0.15)' : '0 1px 4px rgba(27,45,79,0.06)',
          }}>
            {/* Badge */}
            {plan.badge && (
              <div style={{ background: C.orange, padding: '6px 16px', textAlign: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{plan.badge}</span>
              </div>
            )}

            <div style={{ padding: 20 }}>
              {/* Prix */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: C.navy }}>{plan.name}</div>
                  <div style={{ fontSize: 12, color: C.textSoft, marginTop: 2 }}>{plan.desc}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {plan.price === 0
                    ? <div style={{ fontSize: 28, fontWeight: 800, color: C.navy }}>Gratuit</div>
                    : <>
                        <div style={{ fontSize: 28, fontWeight: 800, color: plan.highlight ? C.orange : C.navy }}>
                          {plan.price}€
                        </div>
                        <div style={{ fontSize: 11, color: C.textSoft }}>/ mois HT</div>
                      </>
                  }
                </div>
              </div>

              {/* Features */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 18 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 13, color: C.green, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: C.textMid }}>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button onClick={() => handleChoix(plan)} disabled={loading === plan.id} style={{
                width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 800,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
                background: plan.highlight ? C.navy : plan.price === 0 ? C.bg : C.bg,
                color: plan.highlight ? '#fff' : C.navy,
                border: plan.highlight ? 'none' : `1.5px solid ${C.border}`,
              }}>
                {loading === plan.id ? '⏳ Redirection...' : plan.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Garanties */}
      <div style={{ maxWidth: 480, margin: '24px auto 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '🔒', text: 'Paiement sécurisé par Stripe' },
          { icon: '🔄', text: 'Résiliation en 1 clic' },
          { icon: '📞', text: 'Support réactif par email' },
          { icon: '🇫🇷', text: 'Données hébergées en France' },
        ].map(g => (
          <div key={g.text} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>{g.icon}</span>
            <span style={{ fontSize: 11, color: C.textMid, fontWeight: 600 }}>{g.text}</span>
          </div>
        ))}
      </div>

      {/* FAQ rapide */}
      <div style={{ maxWidth: 480, margin: '24px auto 0' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.navy, marginBottom: 12, textAlign: 'center' }}>Questions fréquentes</div>
        {[
          { q: 'Puis-je annuler à tout moment ?', r: 'Oui, sans frais ni engagement. Vous gardez accès jusqu\'à la fin de la période payée.' },
          { q: 'La carte bancaire est-elle requise pour l\'essai ?', r: 'Non. Les 14 jours d\'essai ne nécessitent aucune information de paiement.' },
          { q: 'Mes devis sont-ils vraiment conformes à la loi ?', r: 'Oui. Le PDF inclut les 15 mentions obligatoires, l\'assurance décennale, les conditions de paiement et les zones de signature.' },
          { q: 'Les frais Stripe sont-ils inclus ?', r: 'Stripe prélève 1,5% + 0,25€ par transaction - soit environ 0,54€ sur 19€. Transparent et sans surprise.' },
        ].map((item, i) => (
          <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 4 }}>{item.q}</div>
            <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.5 }}>{item.r}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
