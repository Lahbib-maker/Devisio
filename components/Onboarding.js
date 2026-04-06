'use client'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { C } from './ui'

const ETAPES = [
  { num: 1, titre: 'Votre métier',      icon: '🔧' },
  { num: 2, titre: 'Vos informations',  icon: '🏢' },
  { num: 3, titre: 'Votre assurance',   icon: '🛡️' },
  { num: 4, titre: 'Prêt !',            icon: '🚀' },
]

const METIERS = [
  { id: 'plombier',     label: 'Plombier',     emoji: '🔧' },
  { id: 'electricien',  label: 'Électricien',   emoji: '⚡' },
  { id: 'peintre',      label: 'Peintre',       emoji: '🎨' },
  { id: 'maçon',        label: 'Maçon',         emoji: '🧱' },
  { id: 'menuisier',    label: 'Menuisier',     emoji: '🪵' },
  { id: 'charpentier',  label: 'Charpentier',   emoji: '🏗️' },
  { id: 'carreleur',    label: 'Carreleur',     emoji: '🟦' },
  { id: 'couvreur',     label: 'Couvreur',      emoji: '🏠' },
  { id: 'chauffagiste', label: 'Chauffagiste',  emoji: '🔥' },
  { id: 'serrurier',    label: 'Serrurier',     emoji: '🔑' },
  { id: 'jardinier',    label: 'Paysagiste',    emoji: '🌿' },
  { id: 'platrier',     label: 'Plâtrier',      emoji: '🪣' },
  { id: 'isolation',    label: 'Isolation',     emoji: '🧊' },
  { id: 'climaticien',  label: 'Climaticien',   emoji: '❄️' },
  { id: 'vitrier',      label: 'Vitrier',       emoji: '🪟' },
  { id: 'cuisiniste',   label: 'Cuisiniste',    emoji: '🍳' },
  { id: 'domotique',    label: 'Domotique',     emoji: '📱' },
  { id: 'ramoneur',     label: 'Ramoneur',      emoji: '🏭' },
]

export default function Onboarding({ user, onComplete, onSkip }) {
  const [etape, setEtape] = useState(1)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    metier: '', forme_juridique: 'EI',
    raison_sociale: '', siret: '', adresse: '', tel: '',
    assurance_nom: '', assurance_police: '', assurance_zone: 'France métropolitaine',
  })

  const set = (k, v) => setData(d => ({ ...d, [k]: v }))

  const input = (label, key, ph, required = false) => (
    <div key={key}>
      <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: 'block', marginBottom: 5 }}>
        {label}{required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
      </label>
      <input
        type="text" value={data[key]} onChange={e => set(key, e.target.value)}
        placeholder={ph}
        style={{
          width: '100%', borderRadius: 12, padding: '11px 14px', fontSize: 14,
          background: C.surfaceAlt, border: `1.5px solid ${!data[key] && required ? '#FECACA' : C.border}`,
          color: C.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
        }}
      />
    </div>
  )

  const sauvegarder = async () => {
    setSaving(true)
    try {
      await supabase.from('profils').upsert({
        user_id: user.id,
        ...data,
        onboarding_complete: true,
      }, { onConflict: 'user_id' })
      onComplete()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const peutContinuer = {
    1: !!data.metier,
    2: !!data.raison_sociale && !!data.siret && !!data.adresse,
    3: !!data.assurance_nom && !!data.assurance_police,
    4: true,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Header */}
      <div style={{ background: C.navy, padding: '14px 20px', textAlign: 'center', position: 'relative' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
          📐 Devis<span style={{ color: C.orange }}>io</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>
          Configuration de votre compte - {etape}/4
        </div>
        {onSkip && (
          <button onClick={onSkip} style={{
            position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            fontSize: 11, color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
          }}>Passer &gt;</button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: C.border }}>
        <div style={{
          height: '100%', transition: 'width 0.4s ease',
          width: `${(etape / 4) * 100}%`,
          background: `linear-gradient(90deg, ${C.navy}, ${C.orange})`,
        }} />
      </div>

      <div style={{ padding: '24px 20px 80px', maxWidth: 480, margin: '0 auto' }}>

        {/* Étapes indicateur */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 28 }}>
          {ETAPES.map(e => (
            <div key={e.num} style={{
              width: 32, height: 32, borderRadius: 99,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: e.num <= etape ? 14 : 11,
              background: e.num < etape ? C.green : e.num === etape ? C.navy : C.border,
              color: e.num <= etape ? '#fff' : C.textSoft,
              fontWeight: 800, transition: 'all 0.3s',
            }}>
              {e.num < etape ? '✓' : e.icon}
            </div>
          ))}
        </div>

        {/* ── ÉTAPE 1 - Métier ── */}
        {etape === 1 && (
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 6 }}>Votre métier</div>
            <div style={{ fontSize: 14, color: C.textMid, marginBottom: 20 }}>
              Choisissez votre corps de métier pour que l'IA génère des devis adaptés.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {METIERS.map(m => (
                <button key={m.id} onClick={() => set('metier', m.label)} style={{
                  padding: '12px 6px', borderRadius: 12, fontSize: 10, fontWeight: 700,
                  cursor: 'pointer', border: 'none', fontFamily: 'inherit', textAlign: 'center',
                  background: data.metier === m.label ? C.navy : C.surface,
                  color: data.metier === m.label ? '#fff' : C.textMid,
                  boxShadow: data.metier === m.label ? '0 2px 8px rgba(27,45,79,0.2)' : `0 1px 3px rgba(0,0,0,0.06)`,
                  border: `1px solid ${data.metier === m.label ? C.navy : C.border}`,
                  transition: 'all 0.12s',
                }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{m.emoji}</div>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 - Infos entreprise ── */}
        {etape === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 6 }}>Votre entreprise</div>
              <div style={{ fontSize: 14, color: C.textMid, marginBottom: 4 }}>
                Ces informations apparaîtront sur tous vos devis.
              </div>
              <div style={{ fontSize: 12, color: C.orange, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ Obligatoires pour des devis conformes à la loi
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: 'block', marginBottom: 5 }}>
                Forme juridique <span style={{ color: C.red }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['EI', 'Auto-entrepreneur', 'EURL', 'SARL', 'SAS'].map(f => (
                  <button key={f} onClick={() => set('forme_juridique', f)} style={{
                    padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    cursor: 'pointer', border: 'none', fontFamily: 'inherit',
                    background: data.forme_juridique === f ? C.navy : C.surfaceAlt,
                    color: data.forme_juridique === f ? '#fff' : C.textMid,
                    border: `1px solid ${data.forme_juridique === f ? C.navy : C.border}`,
                  }}>{f}</button>
                ))}
              </div>
            </div>

            {input('Raison sociale / Nom', 'raison_sociale', 'Martin Électricité ou Jean Martin', true)}
            {input('Numéro SIRET (14 chiffres)', 'siret', '12345678901234', true)}
            {input('Adresse du siège social', 'adresse', '12 rue des Artisans, 69001 Lyon', true)}
            {input('Téléphone', 'tel', '06 12 34 56 78')}
          </div>
        )}

        {/* ── ÉTAPE 3 - Assurance ── */}
        {etape === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.navy, marginBottom: 6 }}>Assurance décennale</div>
              <div style={{ fontSize: 14, color: C.textMid, marginBottom: 16 }}>
                Obligatoire sur tous les devis BTP depuis la loi du 18 juin 2014.
              </div>
            </div>
            {input('Nom de l\'assureur', 'assurance_nom', 'AXA, Allianz, Maaf, Groupama...', true)}
            {input('Numéro de police', 'assurance_police', 'DC-2024-123456', true)}
            {input('Zone géographique couverte', 'assurance_zone', 'France métropolitaine')}

            <div style={{ background: C.orangeL, border: `1px solid ${C.orangeB}`, borderRadius: 12, padding: '12px 14px', fontSize: 12, color: C.orange, lineHeight: 1.5 }}>
              💡 Ces informations se trouvent sur votre attestation d'assurance décennale annuelle.
            </div>
          </div>
        )}

        {/* ── ÉTAPE 4 - Prêt ── */}
        {etape === 4 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.navy, marginBottom: 8 }}>
              Vous êtes prêt !
            </div>
            <div style={{ fontSize: 14, color: C.textMid, lineHeight: 1.6, marginBottom: 24 }}>
              Votre profil est configuré. Vos devis seront conformes à la loi française dès maintenant.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, textAlign: 'left', marginBottom: 24 }}>
              {[
                ['✅', 'Métier', data.metier],
                ['✅', 'Entreprise', data.raison_sociale],
                ['✅', 'SIRET', data.siret],
                ['✅', 'Assurance', data.assurance_nom],
              ].map(([icon, label, val]) => (
                <div key={label} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span>{icon}</span>
                  <span style={{ fontSize: 13, color: C.textSoft, minWidth: 80 }}>{label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{val || '-'}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 13, color: C.textSoft, marginBottom: 16 }}>
              Vous pouvez modifier ces informations à tout moment dans l'onglet Profil.
            </div>
          </div>
        )}

        {/* Boutons navigation */}
        <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
          {etape > 1 && (
            <button onClick={() => setEtape(e => e - 1)} style={{
              flex: 1, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 700,
              background: C.surfaceAlt, color: C.navy, border: `1.5px solid ${C.border}`,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>&lt; Retour</button>
          )}

          {etape < 4
            ? <button
                onClick={() => setEtape(e => e + 1)}
                disabled={!peutContinuer[etape]}
                style={{
                  flex: 2, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 800,
                  border: 'none', cursor: peutContinuer[etape] ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit', transition: 'all 0.2s',
                  background: peutContinuer[etape] ? C.navy : C.surfaceAlt,
                  color: peutContinuer[etape] ? '#fff' : C.textSoft,
                }}>
                Continuer &gt;
              </button>
            : <button onClick={sauvegarder} disabled={saving} style={{
                flex: 2, padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 800,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: C.orange, color: '#fff',
                boxShadow: '0 4px 16px rgba(232,101,10,0.3)',
              }}>
                {saving ? '⏳ Sauvegarde...' : '🚀 Générer mon premier devis'}
              </button>
          }
        </div>

        {/* Skip */}
        {etape < 4 && (
          <button onClick={() => setEtape(4)} style={{
            display: 'block', width: '100%', marginTop: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, color: C.textSoft, fontFamily: 'inherit',
          }}>
            Passer pour l'instant - je complèterai plus tard
          </button>
        )}
      </div>
    </div>
  )
}
