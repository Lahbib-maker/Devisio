'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import AuthScreen from '../components/AuthScreen'
import DevisIA from '../components/DevisIA'
import DevisList from '../components/DevisList'
import ProfilArtisan from '../components/ProfilArtisan'
import MesFactures from '../components/MesFactures'
import MesClients from '../components/MesClients'
import MesChantiers from '../components/MesChantiers'
import Analytics from '../components/Analytics'
import Onboarding from '../components/Onboarding'
import FeedbackBtn from '../components/FeedbackBtn'
import { C, Toast } from '../components/ui'

const TABS = [
  { label: 'Accueil',   icon: '⚡' },
  { label: 'Devis',     icon: '✨' },
  { label: 'Mes devis', icon: '📋' },
  { label: 'Clients',   icon: '👥' },
  { label: 'Chantiers', icon: '🏗️' },
  { label: 'Factures',  icon: '🧾' },
  { label: 'Stats',     icon: '📊' },
  { label: 'Profil',    icon: '👤' },
]

function InstallBanner() {
  const [show, setShow] = useState(false)
  const [prompt, setPrompt] = useState(null)
  useEffect(() => {
    const h = e => { e.preventDefault(); setPrompt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])
  if (!show) return null
  const install = async () => { if (prompt) { prompt.prompt(); await prompt.userChoice }; setShow(false) }
  return (
    <div style={{ background: C.navy, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', flex: 1 }}>📱 Installer Devios sur votre téléphone</div>
      <button onClick={install} style={{ padding: '4px 10px', borderRadius: 7, fontSize: 10, fontWeight: 700, background: C.orange, color: '#fff', border: 'none', cursor: 'pointer' }}>Installer</button>
      <button onClick={() => setShow(false)} style={{ padding: '4px 7px', borderRadius: 7, fontSize: 10, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer' }}>✕</button>
    </div>
  )
}

function usePushNotifications(user) {
  useEffect(() => {
    if (!user || !('Notification' in window) || !('serviceWorker' in navigator)) return
    const register = async () => {
      const reg = await navigator.serviceWorker.ready
      if (Notification.permission === 'granted') {
        try {
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_KEY || '',
          })
          await fetch('/api/push', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub, userId: user.id })
          })
        } catch {}
      }
    }
    register()
  }, [user])

  const demander = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm === 'granted') {
      new Notification('Devios activé 🎉', {
        body: 'Vous recevrez une notification quand un client ouvre votre devis.',
        icon: '/icon-192.png',
      })
    }
  }

  return { demander, permission: 'default' }
}

function Dashboard({ user, setActiveTab, setToast }) {
  const [stats, setStats]           = useState(null)
  const [devisEnAttente, setDevisEnAttente] = useState([])
  const [relancing, setRelancing]   = useState(null)
  const [emailsRelance, setEmailsRelance] = useState({})
  const { demander, permission }    = usePushNotifications(user)

  const charger = useCallback(async () => {
    if (!user) return
    const debut = new Date(); debut.setDate(1); debut.setHours(0,0,0,0)
    const [{ data: devis }, { data: factures }] = await Promise.all([
      supabase.from('devis').select('*').eq('user_id', user.id),
      supabase.from('factures').select('*').eq('user_id', user.id),
    ])
    const d = devis || [], f = factures || []
    const ceMois    = d.filter(x => new Date(x.created_at) >= debut)
    const acceptes  = d.filter(x => x.statut === 'accepté')
    const taux      = d.length ? Math.round(acceptes.length / d.length * 100) : 0
    const caMois    = ceMois.filter(x => x.statut === 'accepté').reduce((s, x) => s + (x.total_ttc||0), 0)
    const nbOuverts = d.filter(x => x.ouvert_le).length
    const cinqJours = new Date(Date.now() - 5*24*60*60*1000)
    setStats({ caMois, taux, nbDevis: d.length, nbOuverts, nbFactures: f.length })
    setDevisEnAttente(d.filter(x => x.statut === 'envoyé' && new Date(x.created_at) < cinqJours))
  }, [user])

  useEffect(() => { charger() }, [charger])

  const relancer = async (devis) => {
    const email = emailsRelance[devis.id]
    if (!email) return
    setRelancing(devis.id)
    try {
      const jours = Math.floor((Date.now() - new Date(devis.created_at)) / 86400000)
      const res = await fetch('/api/relance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId: devis.id, clientEmail: email, artisanEmail: user.email, devisTitre: devis.titre, devisTotal: `${devis.total_ttc?.toLocaleString('fr-FR')} €`, joursAttente: jours })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setToast({ message: `✅ Relance envoyée !`, type: 'success' })
      setEmailsRelance(e => ({ ...e, [devis.id]: '' }))
    } catch (e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
    finally { setRelancing(null) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ paddingTop: 8 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.navy }}>Bonjour 👋</div>
        <div style={{ fontSize: 13, color: C.textSoft, marginTop: 2 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* Notification push */}
      {permission === 'default' && (
        <button onClick={demander} style={{
          width: '100%', padding: '11px 14px', borderRadius: 14, border: `1px solid ${C.orangeB}`,
          background: C.orangeL, cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.orange }}>Activer les notifications</div>
            <div style={{ fontSize: 11, color: C.textMid }}>Sachez quand votre client ouvre le devis</div>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: C.orange }}>Activer &gt;</span>
        </button>
      )}

      {/* Stats */}
      {stats ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'CA ce mois',        value: `${stats.caMois.toLocaleString('fr-FR')} €`, icon: '💶', color: C.green },
            { label: 'Total devis',        value: stats.nbDevis,                               icon: '📋', color: C.navy },
            { label: "Taux d'acceptation", value: `${stats.taux}%`,                            icon: '✅', color: C.navy },
            { label: 'Devis ouverts',      value: stats.nbOuverts,                             icon: '👁️', color: C.orange },
          ].map(s => (
            <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, boxShadow: '0 1px 4px rgba(27,45,79,0.06)', cursor: 'pointer' }} onClick={() => setActiveTab(4)}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.textSoft, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, textAlign: 'center', color: C.textSoft, fontSize: 13 }}>Chargement...</div>
      )}

      {/* CTA nouveau devis */}
      <button onClick={() => setActiveTab(1)} style={{
        width: '100%', padding: '14px 16px', borderRadius: 16, border: 'none', cursor: 'pointer',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: `linear-gradient(135deg, ${C.navy}, #2A4070)`, boxShadow: '0 4px 16px rgba(27,45,79,0.2)',
      }}>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>✨ Nouveau devis IA</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Générer un devis en 30 secondes</div>
        </div>
        <span style={{ fontSize: 22, color: C.orange }}>&gt;</span>
      </button>

      {/* Relances */}
      {devisEnAttente.length > 0 && (
        <div style={{ background: C.orangeL, border: `1px solid ${C.orangeB}`, borderRadius: 16, padding: '14px 16px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.orange, marginBottom: 3 }}>
            💡 {devisEnAttente.length} devis sans réponse depuis +5 jours
          </div>
          <div style={{ fontSize: 11, color: C.textMid, marginBottom: 10 }}>Relancez directement depuis ici.</div>
          {devisEnAttente.slice(0, 3).map(d => {
            const jours = Math.floor((Date.now() - new Date(d.created_at)) / 86400000)
            return (
              <div key={d.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '9px 11px', marginBottom: 7 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{d.titre}</div>
                <div style={{ fontSize: 10, color: C.textSoft, marginBottom: 7 }}>{d.total_ttc?.toLocaleString('fr-FR')} € - Envoyé il y a {jours} jours</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="email" value={emailsRelance[d.id] || ''} onChange={e => setEmailsRelance(p => ({ ...p, [d.id]: e.target.value }))}
                    placeholder="email@client.fr"
                    style={{ flex: 1, borderRadius: 9, padding: '6px 9px', fontSize: 11, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.text, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button onClick={() => relancer(d)} disabled={relancing === d.id || !emailsRelance[d.id]} style={{ padding: '6px 12px', borderRadius: 9, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: relancing === d.id || !emailsRelance[d.id] ? C.border : C.orange, color: relancing === d.id || !emailsRelance[d.id] ? C.textSoft : '#fff' }}>
                    {relancing === d.id ? '⏳' : '📧'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Voir stats */}
      <button onClick={() => setActiveTab(4)} style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.surface, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>📊</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Voir mes statistiques détaillées</div>
          <div style={{ fontSize: 11, color: C.textSoft }}>CA par mois, taux d'acceptation, top métiers</div>
        </div>
        <span style={{ marginLeft: 'auto', color: C.textSoft }}>&gt;</span>
      </button>
    </div>
  )
}

export default function Home() {
  const [session, setSession]               = useState(null)
  const [user, setUser]                     = useState(null)
  const [loading, setLoading]               = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [activeTab, setActiveTab]           = useState(0)
  const [refreshKey, setRefreshKey]         = useState(0)
  const [toast, setToast]                   = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setUser(session?.user ?? null); setLoading(false)
      if (session?.user) checkOnboarding(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session); setUser(session?.user ?? null)
      if (session?.user) checkOnboarding(session.user.id)
    })
    return () => subscription.unsubscribe()
  }, [])

  const checkOnboarding = async (userId) => {
    const { data } = await supabase.from('profils').select('onboarding_complete').eq('user_id', userId).single()
    if (!data?.onboarding_complete) setShowOnboarding(true)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.navy, fontSize: 14, fontWeight: 600 }}>Chargement...</div>
    </div>
  )
  if (!session) return <AuthScreen onAuth={(s, u) => { setSession(s); setUser(u) }} />
  if (showOnboarding) return <Onboarding
    user={user}
    onComplete={() => setShowOnboarding(false)}
    onSkip={async () => {
      await supabase.from('profils').upsert({ user_id: user.id, onboarding_complete: true }, { onConflict: 'user_id' })
      setShowOnboarding(false)
    }}
  />

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <InstallBanner />

      <div style={{ background: C.navy, padding: '11px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 20, boxShadow: '0 2px 12px rgba(27,45,79,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 17 }}>📐</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            Devis<span style={{ color: C.orange }}>io</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          <button onClick={() => supabase.auth.signOut()} style={{ fontSize: 10, padding: '4px 9px', borderRadius: 7, cursor: 'pointer', background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', border: 'none', fontFamily: 'inherit', fontWeight: 600 }}>Déco.</button>
        </div>
      </div>

      <div style={{ padding: '14px 14px 96px' }}>
        {activeTab === 0 && <Dashboard user={user} setActiveTab={setActiveTab} setToast={setToast} />}
        {activeTab === 1 && <DevisIA user={user} setToast={setToast} onSaved={() => { setRefreshKey(k => k+1); setActiveTab(2) }} />}
        {activeTab === 2 && <DevisList refresh={refreshKey} setToast={setToast} />}
        {activeTab === 3 && <MesClients user={user} setToast={setToast} />}
        {activeTab === 4 && <MesChantiers user={user} setToast={setToast} />}
        {activeTab === 5 && <MesFactures user={user} setToast={setToast} />}
        {activeTab === 6 && <Analytics user={user} />}
        {activeTab === 7 && <ProfilArtisan user={user} setToast={setToast} />}
      </div>

      <FeedbackBtn user={user} />

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', padding: '5px 2px 13px', boxShadow: '0 -4px 20px rgba(27,45,79,0.08)' }}>
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 2, padding: '5px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: activeTab === i ? C.orangeL : 'transparent', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 15 }}>{tab.icon}</span>
            <span style={{ fontSize: 8, fontWeight: 700, color: activeTab === i ? C.orange : C.textSoft }}>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
