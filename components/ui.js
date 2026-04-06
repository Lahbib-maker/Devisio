'use client'
import { useEffect } from 'react'

const C = {
  bg:        '#F7F4EF',
  surface:   '#FFFFFF',
  surfaceAlt:'#F0EDE7',
  border:    '#E2DDD6',
  navy:      '#1B2D4F',
  navyLight: '#2A4070',
  orange:    '#E8650A',
  orangeL:   '#FFF0E6',
  orangeB:   '#FFDFC7',
  green:     '#2D7D46',
  greenL:    '#EBF7EE',
  red:       '#C0392B',
  redL:      '#FDECEA',
  text:      '#1B2D4F',
  textMid:   '#4A5568',
  textSoft:  '#8A8F9A',
  amber:     '#D97706',
  amberL:    '#FFFBEB',
}
export { C }

export function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [onClose])
  return (
    <div style={{
      position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
      background: type === 'success' ? C.green : C.red,
      color: '#fff', padding: '11px 22px', borderRadius: 12, zIndex: 9999,
      fontSize: 13, fontWeight: 700, boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
      whiteSpace: 'nowrap',
    }}>{message}</div>
  )
}

export function Badge({ statut }) {
  const map = {
    brouillon: [C.amberL,  C.amber, '#F6D860'],
    envoyé:    ['#EBF4FF', '#2563EB','#BFDBFE'],
    accepté:   [C.greenL,  C.green, '#86EFAC'],
    refusé:    [C.redL,    C.red,   '#FECACA'],
  }
  const [bg, color, border] = map[statut] || map.brouillon
  return (
    <span style={{
      background: bg, color, border: `1px solid ${border}`,
      fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 99, letterSpacing: '0.02em',
    }}>{statut}</span>
  )
}

export function Card({ children, accent = false, style = {} }) {
  return (
    <div style={{
      background: C.surface,
      border: `${accent ? 2 : 1}px solid ${accent ? C.navy : C.border}`,
      borderRadius: 16,
      padding: 16,
      boxShadow: '0 1px 4px rgba(27,45,79,0.06)',
      ...style
    }}>
      {children}
    </div>
  )
}

export function Input({ label, type = 'text', value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', borderRadius: 12, padding: '11px 14px', fontSize: 14,
          background: C.surfaceAlt, border: `1.5px solid ${C.border}`,
          color: C.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export function Button({ children, onClick, disabled, variant = 'primary', small = false }) {
  const variants = {
    primary: { background: disabled ? C.surfaceAlt : C.navy, color: disabled ? C.textSoft : '#fff' },
    orange:  { background: disabled ? C.surfaceAlt : C.orange, color: disabled ? C.textSoft : '#fff' },
    ghost:   { background: C.surfaceAlt, color: C.navy, border: `1.5px solid ${C.border}` },
    danger:  { background: C.redL, color: C.red },
  }
  const v = variants[variant] || variants.primary
  return (
    <button onClick={onClick} disabled={disabled} style={{
      ...v, cursor: disabled ? 'not-allowed' : 'pointer',
      borderRadius: 12, fontWeight: 700, fontFamily: 'inherit',
      width: small ? 'auto' : '100%',
      padding: small ? '7px 14px' : '12px 16px',
      fontSize: small ? 12 : 14,
      border: v.border || 'none',
      transition: 'opacity 0.15s',
    }}>{children}</button>
  )
}
