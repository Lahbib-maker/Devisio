'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C, Toast, Input, Button } from './ui'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [cguAcceptee, setCguAcceptee] = useState(false)

  const submit = async () => {
    if (!email || !password) return
    if (mode === 'signup' && password.length < 6) {
      setToast({ message: '❌ Le mot de passe doit faire au moins 6 caractères', type: 'error' })
      return
    }
    if (mode === 'signup' && !email.includes('@')) {
      setToast({ message: '❌ Adresse email invalide', type: 'error' })
      return
    }
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!cguAcceptee) {
          setToast({ message: '❌ Veuillez accepter les CGU pour créer un compte', type: 'error' })
          setLoading(false)
          return
        }
        const { data: signUpData, error } = await supabase.auth.signUp({ email, password })
        if (!error && signUpData?.user) {
          // Email de bienvenue
          fetch('/api/welcome', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, prenom: email.split('@')[0] })
          }).catch(() => {})
        }
        if (error) throw error
        setToast({ message: '✅ Compte créé ! Connecte-toi.', type: 'success' })
        setMode('login')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuth(data.session, data.user)
      }
    } catch (e) {
      setToast({ message: `❌ ${e.message}`, type: 'error' })
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 20px' }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: C.navy, borderRadius: 16, padding: '10px 20px', marginBottom: 16,
        }}>
          <span style={{ fontSize: 22 }}>📐</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.5px' }}>
            Devi<span style={{ color: C.orange }}>os</span>
          </span>
        </div>
        <div style={{ fontSize: 15, color: C.textMid }}>Devis professionnels en 30 secondes</div>
        <div style={{
          display: 'inline-block', marginTop: 10, padding: '4px 14px',
          background: C.orangeL, border: `1px solid ${C.orangeB}`,
          borderRadius: 99, fontSize: 12, color: C.orange, fontWeight: 700,
        }}>✦ Essai gratuit 14 jours</div>
      </div>

      {/* Card */}
      <div style={{
        background: C.surface, borderRadius: 20,
        border: `1px solid ${C.border}`,
        boxShadow: '0 4px 24px rgba(27,45,79,0.08)',
        padding: 24, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', background: C.surfaceAlt, borderRadius: 12, padding: 3, gap: 3 }}>
          {['login', 'signup'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '9px 0', fontSize: 13, fontWeight: 700,
              borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              background: mode === m ? C.surface : 'transparent',
              color: mode === m ? C.navy : C.textSoft,
              boxShadow: mode === m ? '0 1px 4px rgba(27,45,79,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>{m === 'login' ? 'Connexion' : 'Inscription'}</button>
          ))}
        </div>

        <Input label="Email professionnel" type="email" value={email} onChange={setEmail} placeholder="jean@dupont-plomberie.fr" />
        <Input label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" />
        {mode === 'signup' && (
          <label style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:12, cursor:'pointer' }}>
            <input type="checkbox" checked={cguAcceptee} onChange={e => setCguAcceptee(e.target.checked)}
              style={{ marginTop:3, width:15, height:15, cursor:'pointer', flexShrink:0, accentColor:'#1B2D4F' }}/>
            <span style={{ fontSize:12, color:'#4A5568', lineHeight:1.5 }}>
              J'accepte les{' '}
              <a href="/cgu" target="_blank" style={{ color:'#E8650A', fontWeight:700 }}>CGU</a>
              {' '}et la{' '}
              <a href="/confidentialite" target="_blank" style={{ color:'#E8650A', fontWeight:700 }}>Politique de confidentialité</a>
            </span>
          </label>
        )}
        <Button onClick={submit} disabled={loading || !email || !password}>
          {loading ? 'Connexion...' : mode === 'login' ? 'Se connecter &gt;' : 'Créer mon compte &gt;'}
        </Button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
        {['✨ Devis IA', '📅 Planning', '📧 Email PDF', '🔒 Sécurisé'].map(f => (
          <span key={f} style={{ fontSize: 12, color: C.textSoft }}>{f}</span>
        ))}
      </div>
    </div>
  )
}
