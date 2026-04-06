'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { C, Card, Input, Button, Toast } from './ui'

// Validation SIRET — algorithme de Luhn
function validerSIRET(siret) {
  const s = siret.replace(/\s/g, '')
  if (s.length !== 14 || !/^\d{14}$/.test(s)) return false
  let sum = 0
  for (let i = 0; i < 14; i++) {
    let n = parseInt(s[13 - i])
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9 }
    sum += n
  }
  return sum % 10 === 0
}

const FORMES_JURIDIQUES = ['EI', 'EURL', 'SARL', 'SAS', 'SASU', 'SA', 'Auto-entrepreneur']

const CHAMPS = [
  { key: 'raison_sociale',    label: 'Raison sociale / Nom',        ph: 'Martin Plomberie ou Jean Martin', required: true },
  { key: 'forme_juridique',   label: 'Forme juridique',             ph: null,                              required: true, select: FORMES_JURIDIQUES },
  { key: 'siret',             label: 'Numéro SIRET (14 chiffres)',  ph: '12345678901234',                  required: true },
  { key: 'adresse',           label: 'Adresse du siège social',     ph: '12 rue des Artisans, 69001 Lyon', required: true },
  { key: 'tel',               label: 'Téléphone',                   ph: '06 12 34 56 78',                  required: false },
  { key: 'email',             label: 'Email professionnel',         ph: 'contact@martin-plomberie.fr',     required: false },
  { key: 'site_web',          label: 'Site web (optionnel)',        ph: 'www.martin-plomberie.fr',         required: false },
  { key: 'tva_intra',         label: 'N° TVA intracommunautaire',   ph: 'FR 12 123456789',                 required: false },
  { key: 'assurance_nom',     label: 'Assureur décennale',          ph: 'AXA, Allianz, Maaf...',           required: true },
  { key: 'assurance_police',  label: 'N° de police décennale',      ph: 'DC-2024-123456',                  required: true },
  { key: 'assurance_zone',    label: 'Zone géographique couverte',  ph: 'France métropolitaine',           required: true },
]

export default function ProfilArtisan({ user, onSaved, setToast }) {
  const [profil, setProfil] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [completion, setCompletion] = useState(0)

  useEffect(() => {
    charger()
  }, [user])

  useEffect(() => {
    const requis = CHAMPS.filter(c => c.required)
    const remplis = requis.filter(c => profil[c.key]?.trim())
    setCompletion(Math.round((remplis.length / requis.length) * 100))
  }, [profil])

  const charger = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('profils')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (data) setProfil(data)
    } catch {}
    setLoading(false)
  }

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingLogo(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `logos/${user.id}.${ext}`
      await supabase.storage.from('logos').upload(path, file, { upsert: true })
      const { data } = supabase.storage.from('logos').getPublicUrl(path)
      set('logo_url', data.publicUrl)
      setToast({ message: '✅ Logo uploadé !', type: 'success' })
    } catch (e) {
      setToast({ message: '❌ ' + e.message, type: 'error' })
    }
    setUploadingLogo(false)
  }

    const sauvegarder = async () => {
    // Validation SIRET avant sauvegarde
    if (profil.siret && !validerSIRET(profil.siret)) {
      setToast({ message: '❌ SIRET invalide - vérifiez les 14 chiffres', type: 'error' })
      return
    }
    setSaving(true)
    try {
      const payload = { ...profil, user_id: user.id }
      const { error } = await supabase
        .from('profils')
        .upsert(payload, { onConflict: 'user_id' })
      if (error) throw error
      setToast({ message: '✅ Profil sauvegardé !', type: 'success' })
      if (onSaved) onSaved()
    } catch (e) {
      setToast({ message: `❌ ${e.message}`, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const set = (key, val) => setProfil(p => ({ ...p, [key]: val }))

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: C.textSoft }}>Chargement...</div>
  )

  const manquants = CHAMPS.filter(c => c.required && !profil[c.key]?.trim())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Barre de complétion */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Complétion du profil</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: completion === 100 ? C.green : C.orange }}>{completion}%</div>
        </div>
        <div style={{ height: 8, background: C.surfaceAlt, borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99, transition: 'width 0.4s ease',
            width: `${completion}%`,
            background: completion === 100
              ? `linear-gradient(90deg, ${C.green}, #52c97a)`
              : `linear-gradient(90deg, ${C.orange}, #f59e0b)`,
          }} />
        </div>
        {completion < 100 && (
          <div style={{ marginTop: 8, fontSize: 11, color: C.textSoft }}>
            Manquant : {manquants.map(c => c.label).join(', ')}
          </div>
        )}
        {completion === 100 && (
          <div style={{ marginTop: 8, fontSize: 12, color: C.green, fontWeight: 600 }}>
            ✅ Profil complet - vos devis sont conformes légalement
          </div>
        )}
      </Card>

      {/* Alerte légale */}
      {completion < 100 && (
        <div style={{
          background: C.redL, border: `1px solid #FECACA`,
          borderRadius: 14, padding: '12px 14px',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.red }}>Devis non conformes</div>
            <div style={{ fontSize: 12, color: C.textMid, marginTop: 2 }}>
              Un devis incomplet expose à une amende jusqu'à 3 000€. Complétez votre profil pour que Devios génère des devis 100% légaux.
            </div>
          </div>
        </div>
      )}

      {/* Logo + Couleur */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textSoft, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          🎨 Personnalisation
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>Logo de l'entreprise</div>
          <label style={{ display: 'block', padding: '12px', textAlign: 'center', borderRadius: 12, border: `2px dashed ${C.border}`, cursor: 'pointer', background: C.surfaceAlt }}>
            <input type="file" accept="image/*" onChange={uploadLogo} style={{ display: 'none' }} />
            {uploadingLogo ? <span style={{ fontSize: 13, color: C.textSoft }}>Upload...</span>
              : profil.logo_url ? <div><img src={profil.logo_url} alt="logo" style={{ height: 36, objectFit: 'contain' }} /><div style={{ fontSize: 11, color: C.textSoft, marginTop: 6 }}>Appuyer pour changer</div></div>
              : <span style={{ fontSize: 13, color: C.textSoft }}>📷 Uploader votre logo</span>}
          </label>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.textMid, marginBottom: 6 }}>Couleur principale</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <input type="color" value={profil.couleur_principale || '#1B2D4F'} onChange={e => set('couleur_principale', e.target.value)}
              style={{ width: 44, height: 44, borderRadius: 10, border: 'none', cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: C.textMid, fontFamily: 'monospace' }}>{profil.couleur_principale || '#1B2D4F'}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['#1B2D4F','#E8650A','#2D7D46','#2563EB','#7C3AED','#DC2626','#0F172A','#374151'].map(col => (
              <button key={col} onClick={() => set('couleur_principale', col)}
                style={{ width: 28, height: 28, borderRadius: 99, background: col, border: profil.couleur_principale === col ? '3px solid #000' : '2px solid transparent', cursor: 'pointer' }} />
            ))}
          </div>
        </div>
      </Card>

      {/* Infos entreprise */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textSoft, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
          🏢 Informations entreprise
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CHAMPS.slice(0, 8).map(champ => (
            <div key={champ.key}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: 'block', marginBottom: 5 }}>
                {champ.label}
                {champ.required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
              </label>
              {champ.select ? (
                <select
                  value={profil[champ.key] || ''}
                  onChange={e => set(champ.key, e.target.value)}
                  style={{
                    width: '100%', borderRadius: 12, padding: '11px 14px', fontSize: 14,
                    background: C.surfaceAlt, border: `1.5px solid ${C.border}`,
                    color: profil[champ.key] ? C.text : C.textSoft,
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    appearance: 'none',
                  }}
                >
                  <option value="">Choisir...</option>
                  {champ.select.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              ) : (
                <div>
                  <input
                    type="text"
                    value={profil[champ.key] || ''}
                    onChange={e => set(champ.key, e.target.value)}
                    placeholder={champ.ph}
                    style={{
                      width: '100%', borderRadius: 12, padding: '11px 14px', fontSize: 14,
                      background: C.surfaceAlt,
                      border: `1.5px solid ${
                        champ.key === 'siret' && profil.siret
                          ? validerSIRET(profil.siret) ? C.green : C.red
                          : !profil[champ.key] && champ.required ? '#FECACA' : C.border
                      }`,
                      color: C.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                    }}
                  />
                  {champ.key === 'siret' && profil.siret && (
                    <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600, color: validerSIRET(profil.siret) ? C.green : C.red }}>
                      {validerSIRET(profil.siret) ? '✅ SIRET valide' : '❌ SIRET invalide - vérifiez les 14 chiffres'}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Assurance décennale */}
      <Card>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textSoft, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
          🛡️ Assurance décennale
        </div>
        <div style={{ fontSize: 11, color: C.textSoft, marginBottom: 14 }}>
          Obligatoire sur tous les devis BTP (loi du 18 juin 2014)
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CHAMPS.slice(8).map(champ => (
            <div key={champ.key}>
              <label style={{ fontSize: 12, fontWeight: 700, color: C.textMid, display: 'block', marginBottom: 5 }}>
                {champ.label}
                {champ.required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
              </label>
              <input
                type="text"
                value={profil[champ.key] || ''}
                onChange={e => set(champ.key, e.target.value)}
                placeholder={champ.ph}
                style={{
                  width: '100%', borderRadius: 12, padding: '11px 14px', fontSize: 14,
                  background: C.surfaceAlt, border: `1.5px solid ${!profil[champ.key] && champ.required ? '#FECACA' : C.border}`,
                  color: C.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Bouton sauvegarder */}
      <button onClick={sauvegarder} disabled={saving} style={{
        width: '100%', padding: '13px 0', borderRadius: 12, fontSize: 14, fontWeight: 800,
        border: 'none', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        background: saving ? C.surfaceAlt : C.navy, color: saving ? C.textSoft : '#fff',
        transition: 'all 0.2s',
      }}>
        {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder le profil'}
      </button>

      <div style={{ fontSize: 11, color: C.textSoft, textAlign: 'center' }}>
        * Champs obligatoires pour des devis conformes à la loi française
      </div>
    </div>
  )
}
