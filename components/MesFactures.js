'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C } from './ui'

const STATUT_STYLES = {
  emise:   { bg: '#EBF4FF', color: '#2563EB', label: 'Émise' },
  payee:   { bg: C.greenL,  color: C.green,   label: 'Payée' },
  retard:  { bg: C.redL,    color: C.red,      label: 'En retard' },
}

async function genererPDFFacture(facture, profil) {
  const jsPDF = await new Promise((resolve, reject) => {
    if (window.jspdf) return resolve(window.jspdf.jsPDF)
    if (window.jsPDF) return resolve(window.jsPDF)
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => resolve((window.jspdf && window.jspdf.jsPDF) || window.jsPDF)
    script.onerror = reject
    document.head.appendChild(script)
  })
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, M = 20
  let y = M
  const NAVY = [27,45,79], ORANGE = [232,101,10], GRIS = [110,120,140], GRISC = [240,237,231]

  // Header
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 44, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(18); doc.setFont('helvetica','bold')
  doc.text(profil?.raison_sociale || 'Devios', M, 14)
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(180,200,230)
  ;[profil?.forme_juridique, profil?.adresse, profil?.siret ? `SIRET : ${profil.siret}` : ''].filter(Boolean).forEach((l, i) => doc.text(l, M, 21 + i * 4.5))
  doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
  doc.text('FACTURE', W - M, 14, { align: 'right' })
  doc.setFontSize(11)
  doc.text(facture.numero, W - M, 22, { align: 'right' })
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(180,200,230)
  doc.text(`Date : ${new Date(facture.date_emission).toLocaleDateString('fr-FR')}`, W - M, 29, { align: 'right' })
  doc.text(`Échéance : ${new Date(facture.date_echeance).toLocaleDateString('fr-FR')}`, W - M, 34, { align: 'right' })

  y = 52
  doc.setTextColor(...NAVY); doc.setFontSize(14); doc.setFont('helvetica','bold')
  doc.text(facture.titre || 'Facture de prestation', M, y); y += 12

  // Tableau
  doc.setFillColor(...GRISC); doc.rect(M, y, W-M*2, 7, 'F')
  doc.setTextColor(...NAVY); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text('Désignation', M+2, y+5)
  doc.text('Qté', 124, y+5, {align:'right'}); doc.text('Unité', 142, y+5, {align:'right'})
  doc.text('P.U. HT', 163, y+5, {align:'right'}); doc.text('Total HT', W-M-1, y+5, {align:'right'})
  y += 9; doc.setFont('helvetica','normal')

  let totalHT = 0
  ;(facture.lignes||[]).forEach((l, i) => {
    const lt = Math.round((l.quantite||1)*(l.prixUnitaire||0)*100)/100; totalHT += lt
    if (i%2===0) { doc.setFillColor(250,248,244); doc.rect(M,y-1,W-M*2,8,'F') }
    doc.setTextColor(...NAVY); doc.setFontSize(8)
    doc.text((l.description||'').substring(0,55), M+2, y+5)
    doc.text(String(l.quantite||1), 124, y+5, {align:'right'})
    doc.text(l.unite||'forfait', 142, y+5, {align:'right'})
    doc.text(`${(l.prixUnitaire||0).toLocaleString('fr-FR')} €`, 163, y+5, {align:'right'})
    doc.setFont('helvetica','bold'); doc.text(`${lt.toLocaleString('fr-FR')} €`, W-M-1, y+5, {align:'right'})
    doc.setFont('helvetica','normal'); y += 8
  })
  y += 4

  const tvaTaux = facture.taux_tva || 10
  const tva = Math.round(totalHT*(tvaTaux/100)*100)/100
  const ttc = Math.round((totalHT+tva)*100)/100
  const tx = W-M-58

  doc.setDrawColor(...GRIS); doc.setLineWidth(0.2); doc.line(tx,y,W-M,y); y+=4
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS)
  doc.text('Total HT :', tx, y); doc.text(`${totalHT.toLocaleString('fr-FR')} €`, W-M, y, {align:'right'}); y+=5
  doc.text(`TVA ${tvaTaux}% :`, tx, y); doc.text(`${tva.toLocaleString('fr-FR')} €`, W-M, y, {align:'right'}); y+=5
  doc.setFillColor(...NAVY); doc.roundedRect(tx-2,y,W-M-tx+2,10,2,2,'F')
  doc.setTextColor(255,255,255); doc.setFontSize(10); doc.setFont('helvetica','bold')
  doc.text('TOTAL TTC :', tx, y+7); doc.setTextColor(...ORANGE)
  doc.text(`${ttc.toLocaleString('fr-FR')} €`, W-M-1, y+7, {align:'right'}); y+=16

  // Conditions paiement
  doc.setFillColor(235,247,238); doc.roundedRect(M,y,W-M*2,14,2,2,'F')
  doc.setTextColor(...NAVY); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text('Conditions de paiement :', M+3, y+5)
  doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS)
  doc.text(`Règlement sous 30 jours. Pénalités de retard : 3× taux légal. Indemnité forfaitaire : 40 €.`, M+3, y+10); y+=18

  // Pied
  doc.setFillColor(...GRISC); doc.rect(0,285,W,12,'F')
  doc.setTextColor(...GRIS); doc.setFontSize(6.5); doc.setFont('helvetica','normal')
  doc.text(`${profil?.raison_sociale||'Devios'} — SIRET : ${profil?.siret||'À compléter'}`, W/2, 289, {align:'center'})
  doc.text('Facture générée par Devios · devios.fr', W/2, 294, {align:'center'})

  return { doc, numero: facture.numero }
}

export default function MesFactures({ user, setToast }) {
  const [factures, setFactures] = useState([])
  const [loading, setLoading]   = useState(true)
  const [profil, setProfil]     = useState(null)
  const [sending, setSending]   = useState(null)
  const [emailInput, setEmailInput] = useState({})

  const charger = useCallback(async () => {
    setLoading(true)
    const [{ data: f }, { data: p }] = await Promise.all([
      supabase.from('factures').select('*').order('created_at', { ascending: false }),
      supabase.from('profils').select('*').eq('user_id', user.id).single(),
    ])
    setFactures(f || [])
    setProfil(p)
    setLoading(false)
  }, [user])

    if (!user?.id) return
  useEffect(() => { charger() }, [charger])

  const changerStatut = async (id, statut) => {
    await supabase.from('factures').update({ statut }).eq('id', id)
    charger()
  }

  const telecharger = async (f) => {
    try {
      const { doc, numero } = await genererPDFFacture(f, profil)
      doc.save(`facture-${numero}.pdf`)
      setToast({ message: '📥 Facture téléchargée !', type: 'success' })
    } catch (e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
  }

  const envoyer = async (f) => {
    const email = emailInput[f.id]
    if (!email) return
    setSending(f.id)
    try {
      const { doc, numero } = await genererPDFFacture(f, profil)
      const pdfBase64 = doc.output('datauristring').split(',')[1]
      const res = await fetch('/api/send-devis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientEmail: email, artisanEmail: user.email,
          devis: { titre: f.titre, lignes: f.lignes, totalHT: f.total_ttc / (1 + (f.taux_tva||10)/100), tva: f.total_ttc - f.total_ttc/(1+(f.taux_tva||10)/100), totalTTC: f.total_ttc },
          numDevis: numero, pdfBase64, devisId: f.id,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setToast({ message: `✅ Facture envoyée à ${email} !`, type: 'success' })
      setEmailInput(e => ({ ...e, [f.id]: '' }))
    } catch (e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
    finally { setSending(null) }
  }

  const totalPaye   = factures.filter(f => f.statut === 'payee').reduce((s, f) => s + (f.total_ttc||0), 0)
  const totalAttente = factures.filter(f => f.statut === 'emise').reduce((s, f) => s + (f.total_ttc||0), 0)

    if (!user) return null

  if (loading) return <div style={{ textAlign:'center', padding:'56px 0', color: C.textSoft, fontSize:14 }}>Chargement...</div>

  if (factures.length === 0) return (
    <div style={{ background: C.surface, border: `1.5px dashed ${C.border}`, borderRadius: 16, padding: '56px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>Aucune facture pour l'instant</div>
      <div style={{ fontSize: 12, color: C.textSoft, marginTop: 4 }}>Convertissez un devis accepté en facture depuis l'onglet "Mes devis"</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 4px rgba(27,45,79,0.06)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.green }}>{totalPaye.toLocaleString('fr-FR')} €</div>
          <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>Encaissé</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px', boxShadow: '0 1px 4px rgba(27,45,79,0.06)' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#2563EB' }}>{totalAttente.toLocaleString('fr-FR')} €</div>
          <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>En attente</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{factures.length} facture{factures.length > 1 ? 's' : ''}</span>
        <button onClick={charger} style={{ fontSize: 12, color: C.textSoft, background: 'none', border: 'none', cursor: 'pointer' }}>↺ Actualiser</button>
      </div>

      {factures.map(f => {
        const st = STATUT_STYLES[f.statut] || STATUT_STYLES.emise
        const enRetard = f.statut === 'emise' && new Date(f.date_echeance) < new Date()
        const showEmail = emailInput[f.id] !== undefined

        return (
          <div key={f.id} style={{ background: C.surface, border: `1px solid ${enRetard ? C.red : C.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(27,45,79,0.06)' }}>
            <div style={{ padding: '13px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.textSoft, fontFamily: 'monospace' }}>{f.numero}</span>
                    <span style={{ background: st.bg, color: st.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>
                      {enRetard ? '⚠️ En retard' : st.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{f.titre}</div>
                  <div style={{ fontSize: 11, color: C.textSoft, marginTop: 2 }}>
                    Émise le {new Date(f.date_emission).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    {' - '}Échéance {new Date(f.date_echeance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: f.statut === 'payee' ? C.green : C.orange }}>{f.total_ttc?.toLocaleString('fr-FR')} €</div>
                  <div style={{ fontSize: 10, color: C.textSoft, marginTop: 2 }}>TTC</div>
                  {f.type && <div style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: f.type === 'acompte' ? '#FEF3C7' : '#EBF4FF', color: f.type === 'acompte' ? '#D97706' : '#2563EB', marginTop: 3, display: 'inline-block' }}>{f.type}</div>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ borderTop: `1px solid ${C.border}`, padding: '9px 14px', background: C.bg, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                {['emise','payee','retard'].map(s => (
                  <button key={s} onClick={() => changerStatut(f.id, s)} style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
                    border: 'none', fontFamily: 'inherit', fontWeight: 700,
                    background: f.statut === s ? C.navy : C.surface,
                    color: f.statut === s ? '#fff' : C.textSoft,
                    boxShadow: f.statut === s ? '0 1px 4px rgba(27,45,79,0.2)' : 'none',
                  }}>{STATUT_STYLES[s].label}</button>
                ))}
                <button onClick={() => telecharger(f)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: C.surfaceAlt, color: C.navy, border: `1px solid ${C.border}`, cursor: 'pointer', fontWeight: 700 }}>
                  📥 PDF
                </button>
                <button onClick={() => setEmailInput(e => ({ ...e, [f.id]: e[f.id] !== undefined ? undefined : '' }))} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: C.orange, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                  📧 Envoyer
                </button>
              </div>

              {showEmail && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="email" value={emailInput[f.id] || ''} onChange={e => setEmailInput(prev => ({ ...prev, [f.id]: e.target.value }))}
                    placeholder="email@client.fr" autoFocus
                    style={{ flex: 1, borderRadius: 10, padding: '7px 10px', fontSize: 12, background: C.surface, border: `1.5px solid ${C.border}`, color: C.text, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button onClick={() => envoyer(f)} disabled={sending === f.id || !emailInput[f.id]} style={{
                    padding: '7px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    background: sending === f.id || !emailInput[f.id] ? C.border : C.orange,
                    color: sending === f.id || !emailInput[f.id] ? C.textSoft : '#fff',
                    border: 'none', cursor: 'pointer',
                  }}>{sending === f.id ? '⏳' : '&gt;'}</button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
