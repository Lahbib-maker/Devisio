'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C } from './ui'
import { useRouter } from 'next/navigation'

const PLAN_STYLES = {
  gratuit: { bg: '#F0EDE7', color: '#8A8F9A', label: 'Gratuit' },
  solo:    { bg: '#FFF0E6', color: '#E8650A', label: 'Solo ⚡' },
  pro:     { bg: '#EBF7EE', color: '#2D7D46', label: 'Pro 🚀' },
}

export default function AbonnementBadge({ user }) {
  const [plan, setPlan] = useState('gratuit')
  const [devisCount, setDevisCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    charger()
  }, [user])

  const charger = async () => {
    try {
      const { data } = await supabase
        .from('profils')
        .select('plan, subscription_status')
        .eq('user_id', user.id)
        .single()
      if (data?.plan) setPlan(data.plan)

      // Compte les devis ce mois
      const debut = new Date()
      debut.setDate(1); debut.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('devis')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('created_at', debut.toISOString())
      setDevisCount(count || 0)
    } catch {}
  }

  const gererAbonnement = async () => {
    if (plan === 'gratuit') { router.push('/pricing'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (e) { alert('Erreur : ' + e.message) }
    finally { setLoading(false) }
  }

  const style = PLAN_STYLES[plan] || PLAN_STYLES.gratuit
  const isGratuit = plan === 'gratuit'
  const limite = isGratuit ? 3 : null

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Mon abonnement</span>
            <span style={{ background: style.bg, color: style.color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
              {style.label}
            </span>
          </div>
          {isGratuit && (
            <div style={{ fontSize: 12, color: C.textSoft, marginTop: 4 }}>
              {devisCount}/{limite} devis utilisés ce mois
            </div>
          )}
          {!isGratuit && (
            <div style={{ fontSize: 12, color: C.green, marginTop: 4, fontWeight: 600 }}>
              ✅ Devis illimités - Toutes les fonctionnalités
            </div>
          )}
        </div>
        <button onClick={gererAbonnement} disabled={loading} style={{
          padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
          cursor: 'pointer', border: 'none', fontFamily: 'inherit',
          background: isGratuit ? C.orange : C.navy,
          color: '#fff', transition: 'all 0.2s',
        }}>
          {loading ? '⏳' : isGratuit ? 'Passer Pro &gt;' : 'Gérer'}
        </button>
      </div>

      {/* Barre de progression pour le plan gratuit */}
      {isGratuit && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 6, background: '#F0EDE7', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              width: `${Math.min((devisCount / limite) * 100, 100)}%`,
              background: devisCount >= limite ? C.orange : C.navy,
              transition: 'width 0.4s ease',
            }} />
          </div>
          {devisCount >= limite && (
            <div style={{ marginTop: 6, fontSize: 11, color: C.orange, fontWeight: 700 }}>
              ⚠️ Limite atteinte - passez au plan Solo pour continuer
            </div>
          )}
        </div>
      )}
    </div>
  )
}
