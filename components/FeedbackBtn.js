'use client'
import { useState } from 'react'
import { C } from './ui'

const TYPES = [
  { id: 'bug',       label: '🐛 Bug',           desc: 'Quelque chose ne fonctionne pas' },
  { id: 'idee',      label: '💡 Idée',           desc: 'Une fonctionnalité à ajouter' },
  { id: 'prix',      label: '💰 Prix IA faux',   desc: 'Les tarifs générés sont incorrects' },
  { id: 'general',   label: '💬 Général',        desc: 'Autre chose' },
]

export default function FeedbackBtn({ user }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('general')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const envoyer = async () => {
    if (!message.trim()) return
    setSending(true)
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, type, userId: user?.id, userEmail: user?.email })
      })
      setSent(true)
      setTimeout(() => { setOpen(false); setSent(false); setMessage('') }, 2000)
    } catch {}
    finally { setSending(false) }
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed', bottom: 80, right: 16, zIndex: 50,
          background: C.navy, color: '#fff',
          width: 44, height: 44, borderRadius: 99,
          border: 'none', cursor: 'pointer', fontSize: 18,
          boxShadow: '0 4px 16px rgba(27,45,79,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.15s',
        }}
        title="Donner un avis"
      >
        💬
      </button>

      {/* Modal feedback */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(27,45,79,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 16px 16px',
        }} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={{
            background: C.surface, borderRadius: 20, padding: 20,
            width: '100%', maxWidth: 480,
            boxShadow: '0 -8px 40px rgba(27,45,79,0.15)',
          }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🙏</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>Merci pour votre retour !</div>
                <div style={{ fontSize: 13, color: C.textSoft, marginTop: 4 }}>On lit chaque message.</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.navy }}>Votre avis compte</div>
                  <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.textSoft }}>✕</button>
                </div>

                {/* Type */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {TYPES.map(t => (
                    <button key={t.id} onClick={() => setType(t.id)} style={{
                      padding: '10px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', border: 'none', fontFamily: 'inherit', textAlign: 'left',
                      background: type === t.id ? C.navy : C.surfaceAlt,
                      color: type === t.id ? '#fff' : C.textMid,
                      border: `1px solid ${type === t.id ? C.navy : C.border}`,
                    }}>
                      <div style={{ marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 10, opacity: 0.7, fontWeight: 500 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Décrivez votre problème ou idée..."
                  rows={3} autoFocus
                  style={{
                    width: '100%', borderRadius: 12, padding: '10px 12px', fontSize: 13,
                    background: C.surfaceAlt, border: `1.5px solid ${C.border}`,
                    color: C.text, resize: 'none', outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12,
                  }}
                />

                <button onClick={envoyer} disabled={sending || !message.trim()} style={{
                  width: '100%', padding: '12px 0', borderRadius: 12, fontSize: 14, fontWeight: 800,
                  border: 'none', cursor: message.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                  background: message.trim() ? C.orange : C.surfaceAlt,
                  color: message.trim() ? '#fff' : C.textSoft,
                }}>
                  {sending ? '⏳ Envoi...' : '📤 Envoyer le feedback'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
