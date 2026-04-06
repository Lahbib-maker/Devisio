'use client'
import { useEffect, useState } from 'react'

export default function NotFound() {
  const [count, setCount] = useState(5)

  useEffect(() => {
    const t = setInterval(() => {
      setCount(c => {
        if (c <= 1) { clearInterval(t); window.location.href = '/' }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1B2D4F',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '0 20px', textAlign: 'center',
      fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif",
    }}>
      <div style={{ fontSize: 72, marginBottom: 8 }}>🔨</div>
      <div style={{ fontSize: 80, fontWeight: 800, color: '#E8650A', lineHeight: 1, marginBottom: 8 }}>404</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Page introuvable</div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 32, maxWidth: 280, lineHeight: 1.6 }}>
        Cette page n'existe pas ou a été déplacée.
      </div>

      <a href="/" style={{
        display: 'inline-block',
        background: '#E8650A',
        color: '#fff',
        padding: '13px 28px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 800,
        textDecoration: 'none',
        marginBottom: 16,
        boxShadow: '0 4px 16px rgba(232,101,10,0.4)',
      }}>
        Retour à Devios
      </a>

      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
        Redirection automatique dans {count}s
      </div>
    </div>
  )
}
