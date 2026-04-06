'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C, Badge, Card } from './ui'
import BibliothequePrix from './BibliothequePrix'

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

const TVA_OPTIONS = [
  { taux: 5.5, label: '5,5%', desc: 'Rénovation énergétique' },
  { taux: 10,  label: '10%',  desc: 'Rénovation (+2 ans)' },
  { taux: 20,  label: '20%',  desc: 'Neuf / standard' },
  { taux: 0,   label: '0%',   desc: 'Franchise TVA' },
]

const UNITES = ['forfait', 'heure', 'jour', 'm²', 'm³', 'ml', 'u', 'kg', 'lot']

const PLACEHOLDERS = {
  plombier:    'Ex : Remplacement chauffe-eau 200L au 3e étage...',
  electricien: 'Ex : Mise aux normes tableau 14 circuits, appt 80m²...',
  peintre:     'Ex : Peinture salon 25m², 2 couches, préparation murs...',
  maçon:       'Ex : Ouverture 90cm dans mur porteur, linteau béton...',
  menuisier:   'Ex : Pose 3 fenêtres double vitrage PVC...',
  charpentier: 'Ex : Réfection charpente toiture 120m²...',
  carreleur:   'Ex : Pose carrelage salle de bain 8m²...',
  couvreur:    'Ex : Remplacement 30 tuiles, vérification étanchéité...',
  chauffagiste:'Ex : Installation PAC air/eau 9kW...',
  serrurier:   'Ex : Remplacement serrure 3 points A2P...',
  jardinier:   'Ex : Tonte 500m², taille haie 30ml...',
  platrier:    'Ex : Pose placo 40m², isolation, bande enduit...',
  isolation:   'Ex : ITE façade 80m², laine de roche 14cm...',
  climaticien: 'Ex : Clim réversible 3500W salon + chambre...',
  vitrier:     'Ex : Remplacement double vitrage 3 fenêtres...',
  cuisiniste:  'Ex : Pose cuisine 12 éléments, plan granit 3ml...',
  domotique:   'Ex : Installation Somfy volets + éclairage + alarme...',
  ramoneur:    'Ex : Ramonage cheminée + insert, certificat...',
}

// ── Calculs ────────────────────────────────────────────────
function calcTotaux(lignes, tvaTaux) {
  const totalHT = lignes.reduce((s, l) => s + (parseFloat(l.quantite) || 0) * (parseFloat(l.prixUnitaire) || 0), 0)
  const tva = tvaTaux === 0 ? 0 : Math.round(totalHT * (tvaTaux / 100) * 100) / 100
  const totalTTC = Math.round((totalHT + tva) * 100) / 100
  return { totalHT: Math.round(totalHT * 100) / 100, tva, totalTTC }
}

// ── PDF conforme ───────────────────────────────────────────
async function chargerJsPDF() {
  if (window.jspdf) return window.jspdf.jsPDF
  if (window.jsPDF) return window.jsPDF
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
    script.onload = () => resolve((window.jspdf && window.jspdf.jsPDF) || window.jsPDF)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function genererPDF(devis, lignes, profil, metierLabel, tvaTaux) {
  const jsPDF = await chargerJsPDF()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = 210, M = 20
  let y = M
  const NAVY = [27,45,79], ORANGE = [232,101,10], GRIS = [110,120,140], GRISC = [240,237,231]
  const num = devis?.numero || `DEV-${Date.now().toString().slice(-6)}`

  // Header — couleur personnalisée + logo si disponible
  const couleurHex = profil?.couleur_principale || '#1B2D4F'
  const hexToRgb = h => { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r ? [parseInt(r[1],16),parseInt(r[2],16),parseInt(r[3],16)] : [27,45,79] }
  const [R,G,B] = hexToRgb(couleurHex)
  doc.setFillColor(R,G,B); doc.rect(0, 0, W, 44, 'F')

  // Logo si disponible
  let logoX = M
  if (profil?.logo_url) {
    try {
      await new Promise((resolve) => {
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.onload = () => {
          const ratio = img.width / img.height
          const h = 18, w = Math.min(h * ratio, 50)
          doc.addImage(img, 'PNG', M, 10, w, h)
          logoX = M + w + 6
          resolve()
        }
        img.onerror = () => resolve()
        img.src = profil.logo_url
      })
    } catch {}
  }

  doc.setTextColor(255,255,255); doc.setFontSize(logoX > M ? 13 : 18); doc.setFont('helvetica','bold')
  if (logoX === M) doc.text(profil?.raison_sociale || 'Devios', M, 14)
  else doc.text(profil?.raison_sociale || 'Devios', logoX, 18)
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(180,200,230)
  ;[profil?.forme_juridique, profil?.adresse, profil?.tel, profil?.siret ? `SIRET : ${profil.siret}` : '', profil?.tva_intra ? `TVA : ${profil.tva_intra}` : '']
    .filter(Boolean).forEach((l, i) => doc.text(l, M, 21 + i * 4))
  doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont('helvetica','bold')
  doc.text(`DEVIS N° ${num}`, W-M, 13, { align:'right' })
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(180,200,230)
  doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, W-M, 19, { align:'right' })
  doc.text(`Validité : ${devis.dateValidite || 30} jours`, W-M, 24, { align:'right' })
  doc.text(`Métier : ${metierLabel}`, W-M, 29, { align:'right' })
  y = 52

  doc.setTextColor(...NAVY); doc.setFontSize(13); doc.setFont('helvetica','bold')
  doc.text(devis.titre || 'Devis de prestation', M, y); y += 6
  if (devis.delai) { doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS); doc.text(`Délai : ${devis.delai}`, M, y) }
  y += 8

  // Bloc client
  if (devis.clientNom || devis.client_nom) {
    const nom = devis.clientNom || devis.client_nom || ''
    const adr = devis.clientAdresse || devis.client_adresse || ''
    doc.setFillColor(247,244,239); doc.rect(M, y, (W-M*2)/2 - 4, nom && adr ? 16 : 12, 'F')
    doc.setTextColor(...GRIS); doc.setFontSize(7); doc.setFont('helvetica','bold')
    doc.text('CLIENT', M+3, y+4)
    doc.setFont('helvetica','normal'); doc.setTextColor(...NAVY); doc.setFontSize(9)
    doc.text(nom, M+3, y+9)
    if (adr) { doc.setFontSize(7); doc.setTextColor(...GRIS); doc.text(adr, M+3, y+14) }
    y += nom && adr ? 20 : 16
  } else { y += 4 }

  // Tableau
  doc.setFillColor(...GRISC); doc.rect(M, y, W-M*2, 7, 'F')
  doc.setTextColor(...NAVY); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text('Désignation', M+2, y+5); doc.text('Qté', 124, y+5, {align:'right'})
  doc.text('Unité', 142, y+5, {align:'right'}); doc.text('P.U. HT', 163, y+5, {align:'right'})
  doc.text('Total HT', W-M-1, y+5, {align:'right'}); y += 9
  doc.setFont('helvetica','normal')
  lignes.forEach((l, i) => {
    const lt = Math.round((parseFloat(l.quantite)||0)*(parseFloat(l.prixUnitaire)||0)*100)/100
    if (i%2===0) { doc.setFillColor(250,248,244); doc.rect(M, y-1, W-M*2, 8, 'F') }
    doc.setTextColor(...NAVY); doc.setFontSize(8)
    doc.text((l.description||'').substring(0,55), M+2, y+5)
    doc.text(String(l.quantite||1), 124, y+5, {align:'right'})
    doc.text(l.unite||'forfait', 142, y+5, {align:'right'})
    doc.text(`${(parseFloat(l.prixUnitaire)||0).toLocaleString('fr-FR')} €`, 163, y+5, {align:'right'})
    doc.setFont('helvetica','bold'); doc.text(`${lt.toLocaleString('fr-FR')} €`, W-M-1, y+5, {align:'right'})
    doc.setFont('helvetica','normal'); y += 8
  })
  y += 4

  const { totalHT, tva, totalTTC } = calcTotaux(lignes, tvaTaux)
  const tx = W-M-58
  doc.setDrawColor(...GRIS); doc.setLineWidth(0.2); doc.line(tx, y, W-M, y); y += 4
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS)
  doc.text('Total HT :', tx, y); doc.text(`${totalHT.toLocaleString('fr-FR')} €`, W-M, y, {align:'right'}); y += 5
  if (tvaTaux===0) { doc.text('TVA non applicable — art. 293 B du CGI', tx, y); y += 5 }
  else { doc.text(`TVA ${tvaTaux}% :`, tx, y); doc.text(`${tva.toLocaleString('fr-FR')} €`, W-M, y, {align:'right'}); y += 5 }
  doc.setFillColor(...NAVY); doc.roundedRect(tx-2, y, W-M-tx+2, 10, 2, 2, 'F')
  doc.setTextColor(255,255,255); doc.setFontSize(10); doc.setFont('helvetica','bold')
  doc.text('TOTAL TTC :', tx, y+7); doc.setTextColor(...ORANGE)
  doc.text(`${totalTTC.toLocaleString('fr-FR')} €`, W-M-1, y+7, {align:'right'}); y += 16

  if (profil?.assurance_nom) {
    doc.setFillColor(...GRISC); doc.roundedRect(M, y, W-M*2, 16, 2, 2, 'F')
    doc.setTextColor(...NAVY); doc.setFontSize(8); doc.setFont('helvetica','bold')
    doc.text('Assurance décennale :', M+3, y+6)
    doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS)
    doc.text(`${profil.assurance_nom} — Police n° ${profil.assurance_police} — Zone : ${profil.assurance_zone}`, M+3, y+12); y += 20
  }
  doc.setFillColor(235,247,238); doc.roundedRect(M, y, W-M*2, 20, 2, 2, 'F')
  doc.setTextColor(...NAVY); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text('Conditions de paiement :', M+3, y+6)
  doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS)
  doc.text('Acompte de 30% à la signature. Solde à réception des travaux.', M+3, y+11)
  doc.text('Pénalités de retard : 3× taux légal. Indemnité forfaitaire de recouvrement : 40 €.', M+3, y+16); y += 24

  // Conditions particulières
  const condPart = devis.conditionsParticulieres || devis.conditions_particulieres
  if (condPart) {
    const lines = doc.splitTextToSize(condPart, W-M*2-8)
    const h = Math.min(lines.length, 4) * 5 + 10
    doc.setFillColor(255,248,230); doc.roundedRect(M, y, W-M*2, h, 2, 2, 'F')
    doc.setTextColor(...NAVY); doc.setFontSize(7.5); doc.setFont('helvetica','bold')
    doc.text('Conditions particulières :', M+3, y+6)
    doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS)
    doc.text(lines.slice(0,3), M+3, y+11); y += h + 4
  }

  // Mention auto-entrepreneur si TVA 0%
  if (tvaTaux === 0) {
    doc.setFillColor(...GRISC); doc.roundedRect(M, y, W-M*2, 8, 2, 2, 'F')
    doc.setTextColor(...GRIS); doc.setFontSize(6.5); doc.setFont('helvetica','italic')
    doc.text('TVA non applicable — article 293 B du Code Général des Impôts (régime franchise en base de TVA)', M+3, y+5); y += 12
  }

  if (devis.notes) {
    doc.setFillColor(...GRISC); doc.roundedRect(M, y, W-M*2, 14, 2, 2, 'F')
    doc.setTextColor(...GRIS); doc.setFontSize(7.5); doc.setFont('helvetica','italic')
    doc.text(doc.splitTextToSize(devis.notes, W-M*2-6).slice(0,2), M+3, y+6); y += 18
  }

  y = Math.max(y, 228)
  doc.setTextColor(...NAVY); doc.setFontSize(8); doc.setFont('helvetica','bold')
  doc.text("Signature de l'artisan", M, y)
  doc.text('Signature du client', W-M-60, y)
  doc.setFont('helvetica','normal'); doc.setTextColor(...GRIS); doc.setFontSize(7)
  doc.text('(mention manuscrite obligatoire)', W-M-60, y+4)
  doc.text('"Devis reçu avant exécution des travaux,', W-M-60, y+8)
  doc.text('lu et accepté, bon pour accord" + date', W-M-60, y+12)
  doc.setDrawColor(...GRIS); doc.setLineWidth(0.3)
  doc.line(M, y+18, M+55, y+18); doc.line(W-M-60, y+18, W-M, y+18)
  doc.setFillColor(...GRISC); doc.rect(0, 285, W, 12, 'F')
  doc.setTextColor(...GRIS); doc.setFontSize(6.5); doc.setFont('helvetica','normal')
  doc.text(`${profil?.raison_sociale||'Devios'} — SIRET : ${profil?.siret||'À compléter'} — ${profil?.adresse||''}`, W/2, 289, {align:'center'})
  doc.text("Devis généré par Devios · devios.fr — Conforme à l'arrêté du 24 janvier 2017", W/2, 294, {align:'center'})

  return { doc, numDevis: num }
}

// ── Éditeur de ligne ───────────────────────────────────────
function LigneEditable({ ligne, index, onChange, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const totalHT = Math.round((parseFloat(ligne.quantite)||0) * (parseFloat(ligne.prixUnitaire)||0) * 100) / 100
  const tvLigne = ligne.tvaLigne != null ? ligne.tvaLigne : null
  const TVA_OPTS = [{ v: null, l: 'TVA globale' }, { v: 5.5, l: '5,5%' }, { v: 10, l: '10%' }, { v: 20, l: '20%' }, { v: 0, l: '0%' }]

  if (editing) return (
    <div style={{ background: C.surfaceAlt, border: `1.5px solid ${C.navy}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
      <textarea value={ligne.description} onChange={e => onChange(index,'description',e.target.value)} rows={2}
        style={{ width:'100%', borderRadius:8, padding:'8px 10px', fontSize:12, background:C.surface, border:`1px solid ${C.border}`, color:C.text, resize:'none', outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:8 }}
      />
      {/* Qté + unité + PU */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginBottom:8 }}>
        <div>
          <div style={{ fontSize:10, color:C.textSoft, marginBottom:3, fontWeight:700 }}>Quantité</div>
          <input type="number" value={ligne.quantite} onChange={e => onChange(index,'quantite',e.target.value)}
            style={{ width:'100%', borderRadius:8, padding:'7px 8px', fontSize:12, background:C.surface, border:`1px solid ${C.border}`, color:C.text, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
        </div>
        <div>
          <div style={{ fontSize:10, color:C.textSoft, marginBottom:3, fontWeight:700 }}>Unité</div>
          <select value={ligne.unite} onChange={e => onChange(index,'unite',e.target.value)}
            style={{ width:'100%', borderRadius:8, padding:'7px 6px', fontSize:12, background:C.surface, border:`1px solid ${C.border}`, color:C.text, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}>
            {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize:10, color:C.textSoft, marginBottom:3, fontWeight:700 }}>Prix unit. HT (€)</div>
          <input type="number" value={ligne.prixUnitaire} onChange={e => onChange(index,'prixUnitaire',e.target.value)}
            style={{ width:'100%', borderRadius:8, padding:'7px 8px', fontSize:12, background:C.surface, border:`1px solid ${C.border}`, color:C.text, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
        </div>
      </div>
      {/* 7 - TVA par ligne */}
      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:10, color:C.textSoft, marginBottom:4, fontWeight:700 }}>TVA pour cette ligne</div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {TVA_OPTS.map(opt => (
            <button key={String(opt.v)} onClick={() => onChange(index,'tvaLigne',opt.v)} style={{
              padding:'4px 9px', borderRadius:8, fontSize:10, fontWeight:700, border:'none', cursor:'pointer', fontFamily:'inherit',
              background: tvLigne === opt.v ? C.navy : C.surfaceAlt,
              color: tvLigne === opt.v ? '#fff' : C.textSoft,
            }}>{opt.l}</button>
          ))}
        </div>
        {tvLigne != null && <div style={{ fontSize:10, color:C.orange, marginTop:3, fontWeight:600 }}>TVA spécifique : {tvLigne}% pour cette ligne</div>}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:13, fontWeight:800, color:C.orange }}>{totalHT.toLocaleString('fr-FR')} € HT</div>
        <div style={{ display:'flex', gap:6 }}>
          {confirmDel
            ? <>
                <button onClick={() => setConfirmDel(false)} style={{ padding:'6px 10px', borderRadius:8, fontSize:11, fontWeight:700, background:C.surfaceAlt, color:C.navy, border:`1px solid ${C.border}`, cursor:'pointer' }}>Annuler</button>
                <button onClick={() => onDelete(index)} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700, background:C.red, color:'#fff', border:'none', cursor:'pointer' }}>Confirmer 🗑️</button>
              </>
            : <button onClick={() => setConfirmDel(true)} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700, background:C.redL, color:C.red, border:'none', cursor:'pointer' }}>🗑️</button>
          }
          <button onClick={() => setEditing(false)} style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700, background:C.navy, color:'#fff', border:'none', cursor:'pointer' }}>✓ OK</button>
        </div>
      </div>
    </div>
  )

  return (
    <div onClick={() => setEditing(true)} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${C.border}`, cursor:'pointer', transition:'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background=C.surfaceAlt}
      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
      <div style={{ flex:1, marginRight:10 }}>
        <div style={{ fontSize:13, color:C.text }}>{ligne.description}</div>
        <div style={{ fontSize:11, color:C.textSoft, marginTop:2 }}>{ligne.quantite} {ligne.unite} × {parseFloat(ligne.prixUnitaire||0).toLocaleString('fr-FR')} €</div>
      </div>
      <div style={{ textAlign:'right', flexShrink:0 }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{totalHT.toLocaleString('fr-FR')} €</div>
        <div style={{ fontSize:10, color:C.textSoft, marginTop:1 }}>✏️ modifier</div>
      </div>
    </div>
  )
}

// ── Composant principal ────────────────────────────────────
export default function DevisIA({ user, onSaved, setToast }) {
  const [metier,      setMetier]      = useState(METIERS[0])
  const [tvaOption,   setTvaOption]   = useState(TVA_OPTIONS[1])
  const [description, setDescription] = useState('')
  const [clientNom,   setClientNom]   = useState('')
  const [clientAdresse, setClientAdresse] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [sending,     setSending]     = useState(false)
  const [devis,       setDevis]       = useState(null)
  const [lignes,      setLignes]      = useState([])
  const [titre,       setTitre]       = useState('')
  const [showEmail,   setShowEmail]   = useState(false)
  const [profil,      setProfil]      = useState(null)
  const [editTitre,   setEditTitre]   = useState(false)
  const [profilIncomplet, setProfilIncomplet] = useState(false)
  const [autosaveLabel, setAutosaveLabel] = useState(null)
  const [lignesOriginal, setLignesOriginal] = useState([])
  const [conditionsParticulieres, setConditionsParticulieres] = useState('')
  const [lienPartage, setLienPartage] = useState(null)
  const [estModele, setEstModele]   = useState(false)
  const [dateValidite, setDateValidite] = useState(30) // jours
  const [modeles, setModeles]       = useState([])
  const [showModeles, setShowModeles] = useState(false)

  // Autosave dans localStorage toutes les 30s
  useEffect(() => {
    if (!devis) return
    const brouillon = { titre, lignes, metier, tvaOption, description, clientNom, clientAdresse, clientEmail }
    localStorage.setItem('devios_brouillon', JSON.stringify(brouillon))
    setAutosaveLabel('Sauvegardé')
    const t = setTimeout(() => setAutosaveLabel(null), 2000)
    return () => clearTimeout(t)
  }, [titre, lignes, clientNom, clientAdresse, clientEmail])

  // Restaurer brouillon au montage
  useEffect(() => {
    const saved = localStorage.getItem('devios_brouillon')
    if (saved) {
      try {
        const b = JSON.parse(saved)
        if (b.titre && b.lignes?.length > 0) {
          setTitre(b.titre); setLignes(b.lignes)
          setDescription(b.description || '')
          setClientNom(b.clientNom || ''); setClientAdresse(b.clientAdresse || ''); setClientEmail(b.clientEmail || '')
          if (b.metier) setMetier(b.metier)
          if (b.tvaOption) setTvaOption(b.tvaOption)
          setDevis({ titre: b.titre, lignes: b.lignes })
          setToast({ message: '📋 Brouillon récupéré', type: 'success' })
        }
      } catch {}
    }
  }, [])

  useEffect(() => { chargerProfil() }, [user])

  const chargerModeles = useCallback(async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('devis')
      .select('id, titre, lignes, metier, taux_tva, conditions_particulieres')
      .eq('user_id', user.id)
      .eq('est_modele', true)
      .order('created_at', { ascending: false })
    setModeles(data || [])
  }, [user])

  useEffect(() => { chargerModeles() }, [chargerModeles])

  const chargerProfil = async () => {
    try {
      const { data } = await supabase.from('profils').select('*').eq('user_id', user.id).single()
      setProfil(data)
      // Vérifier si profil est incomplet
      const manque = !data?.siret || !data?.assurance_nom || !data?.raison_sociale
      setProfilIncomplet(manque)
    } catch {}
  }

  // Génère un numéro de devis chronologique correct
  const chargerDepuisModele = (modele) => {
    const m = METIERS.find(x => x.label === modele.metier) || METIERS[0]
    const tva = TVA_OPTIONS.find(x => x.taux === modele.taux_tva) || TVA_OPTIONS[1]
    setMetier(m)
    setTvaOption(tva)
    setTitre(modele.titre + ' (copie)')
    setLignes(modele.lignes || [])
    setLignesOriginal(modele.lignes || [])
    setConditionsParticulieres(modele.conditions_particulieres || '')
    setDevis({ titre: modele.titre, lignes: modele.lignes })
    setShowModeles(false)
    setToast({ message: `📋 Modèle "${modele.titre}" chargé !`, type: 'success' })
    localStorage.removeItem('devios_brouillon')
  }

  const genererNumeroDevis = async () => {
    const annee = new Date().getFullYear()
    const { count } = await supabase
      .from('devis').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    const num = String((count || 0) + 1).padStart(3, '0')
    return `DEV-${annee}-${num}`
  }

  const generer = async () => {
    if (!description.trim()) return
    setLoading(true); setDevis(null)
    try {
      const res = await fetch('/api/devis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, metier: metier.label, tva: tvaOption.taux, userId: user?.id })
      })
      const data = await res.json()
      if (data.error === 'LIMITE_GRATUIT') {
        setToast({ message: '🔒 ' + data.message, type: 'error' })
        return
      }
      if (data.error) throw new Error(data.error)
      const numDevis = await genererNumeroDevis()
      const devisAvecNum = { ...data.devis, numero: numDevis }
      setDevis(devisAvecNum)
      setLignes(data.devis.lignes || [])
      setLignesOriginal(data.devis.lignes || [])
      setTitre(data.devis.titre || '')
      localStorage.removeItem('devios_brouillon')
    } catch (e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
    finally { setLoading(false) }
  }

  const annulerModifications = () => {
    if (lignesOriginal.length > 0) {
      setLignes(lignesOriginal)
      setToast({ message: '↩️ Modifications annulées', type: 'success' })
    }
  }

  const modifierLigne = (index, champ, valeur) => {
    setLignes(prev => prev.map((l, i) => i === index ? { ...l, [champ]: valeur } : l))
  }

  const supprimerLigne = (index) => {
    setLignes(prev => prev.filter((_, i) => i !== index))
  }

  const ajouterLigne = () => {
    setLignes(prev => [...prev, { description: 'Nouvelle prestation', quantite: 1, unite: 'forfait', prixUnitaire: 0 }])
  }

  const { totalHT, tva, totalTTC } = calcTotaux(lignes, tvaOption.taux)

  const telechargerPDF = async () => {
    try {
      const devisEdite = { ...devis, titre, lignes, totalHT, tva, totalTTC, clientNom, clientAdresse, clientEmail, dateValidite, conditionsParticulieres }
      const { doc, numDevis } = await genererPDF(devisEdite, lignes, profil, metier.label, tvaOption.taux)
      doc.save(`devis-${numDevis}.pdf`)
      setToast({ message: '📥 PDF conforme téléchargé !', type: 'success' })
    } catch (e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
  }

  const envoyerEmail = async () => {
    if (!clientEmail) return
    setSending(true)
    try {
      const devisEdite = { ...devis, titre, lignes, totalHT, tva, totalTTC, clientNom, clientAdresse, clientEmail }
      const { doc, numDevis } = await genererPDF(devisEdite, lignes, profil, metier.label, tvaOption.taux)
      const pdfBase64 = doc.output('datauristring').split(',')[1]
      const res = await fetch('/api/send-devis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientEmail, artisanEmail: user.email, artisanNom: profil?.raison_sociale || '', devis: devisEdite, numDevis, pdfBase64, devisId: devis?.id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      // Mise à jour statut automatique si devis sauvegardé
      if (devis?.id) {
        await supabase.from('devis').update({ statut: 'envoyé', client_email: clientEmail }).eq('id', devis.id)
      }
      setToast({ message: `✅ Envoyé à ${clientEmail} !`, type: 'success' })
      setShowEmail(false); setClientEmail('')
    } catch (e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
    finally { setSending(false) }
  }

  const sauvegarder = async () => {
    if (!devis) return
    setSaving(true)
    // Vérifier connexion réseau
    if (!navigator.onLine) {
      setToast({ message: '❌ Pas de connexion internet - devis sauvegardé en brouillon local', type: 'error' })
      localStorage.setItem('devios_brouillon', JSON.stringify({ titre, lignes, metier, tvaOption, description, clientNom, clientAdresse, clientEmail }))
      setSaving(false)
      return
    }
    try {
      const { data: inserted, error } = await supabase.from('devis').insert({
        user_id: user.id, titre, description,
        total_ttc: totalTTC, lignes, statut: 'brouillon',
        metier: metier.label, taux_tva: tvaOption.taux,
        numero: devis.numero,
        client_nom: clientNom, client_adresse: clientAdresse, client_email: clientEmail,
        conditions_particulieres: conditionsParticulieres || null,
        est_modele: estModele,
        date_validite: dateValidite,
      }).select('id').single()
      if (error) {
        // Sauvegarde locale si Supabase échoue
        localStorage.setItem('devios_brouillon', JSON.stringify({ titre, lignes, metier, tvaOption, description, clientNom, clientAdresse, clientEmail }))
        throw new Error('Erreur serveur - brouillon sauvegardé localement')
      }
      localStorage.removeItem('devios_brouillon')
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://devios.fr'
      if (inserted?.id) setLienPartage(`${appUrl}/devis/${inserted.id}`)
      setToast({ message: `✅ Devis ${devis.numero} sauvegardé !`, type: 'success' })
      if (estModele) chargerModeles()
      onSaved()
    } catch (e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
    finally { setSaving(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Sélecteur métier */}
      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Mon métier</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, maxHeight: 210, overflowY: 'auto' }}>
          {METIERS.map(m => (
            <button key={m.id} onClick={() => { setMetier(m); setDevis(null); setDescription('') }} style={{
              padding: '9px 4px', borderRadius: 10, fontSize: 10, fontWeight: 700, cursor: 'pointer',
              border: 'none', fontFamily: 'inherit', textAlign: 'center', lineHeight: 1.4, transition: 'all 0.12s',
              background: metier.id === m.id ? C.navy : C.surfaceAlt,
              color: metier.id === m.id ? '#fff' : C.textMid,
              boxShadow: metier.id === m.id ? '0 2px 8px rgba(27,45,79,0.25)' : 'none',
            }}>
              <div style={{ fontSize: 18, marginBottom: 2 }}>{m.emoji}</div>{m.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Modèles réutilisables */}
      {modeles.length > 0 && (
        <div>
          <button onClick={() => setShowModeles(v => !v)} style={{
            width:'100%', padding:'11px 14px', borderRadius:14, border:`1.5px solid ${C.border}`,
            background: showModeles ? C.navy : C.surface, color: showModeles ? '#fff' : C.navy,
            cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'space-between',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>📂</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontSize:13, fontWeight:700 }}>Mes modèles ({modeles.length})</div>
                <div style={{ fontSize:10, opacity:0.65, marginTop:1 }}>Repartir d'un devis existant</div>
              </div>
            </div>
            <span style={{ fontSize:12, opacity:0.6 }}>{showModeles ? '▲' : '▼'}</span>
          </button>

          {showModeles && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:14, overflow:'hidden', marginTop:6 }}>
              {modeles.map((m, i) => (
                <div key={m.id} style={{ padding:'12px 14px', borderBottom: i < modeles.length-1 ? `1px solid ${C.border}` : 'none', display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{m.titre}</div>
                    <div style={{ fontSize:11, color:C.textSoft, marginTop:2 }}>
                      {m.metier} - TVA {m.taux_tva}% - {(m.lignes||[]).length} ligne{(m.lignes||[]).length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <button onClick={() => chargerDepuisModele(m)} style={{
                    padding:'7px 14px', borderRadius:10, fontSize:12, fontWeight:700,
                    background:C.navy, color:'#fff', border:'none', cursor:'pointer', flexShrink:0,
                  }}>Utiliser &gt;</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Guard profil incomplet */}
      {profilIncomplet && (
        <div style={{ background:'#FFF0E6', border:'1.5px solid #FFD4A8', borderRadius:14, padding:'13px 14px', display:'flex', gap:10, alignItems:'flex-start' }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#92400E' }}>Profil incomplet - devis non conforme</div>
            <div style={{ fontSize:11, color:'#78350F', marginTop:3, lineHeight:1.5 }}>Il manque votre SIRET, raison sociale ou assurance décennale. Le PDF généré ne sera pas légalement valide.</div>
          </div>
        </div>
      )}

      {/* TVA */}
      <Card>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Taux de TVA</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {TVA_OPTIONS.map(opt => (
            <button key={opt.taux} onClick={() => setTvaOption(opt)} style={{
              padding: '9px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.12s',
              background: tvaOption.taux === opt.taux ? C.navy : C.surfaceAlt,
            }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: tvaOption.taux === opt.taux ? '#fff' : C.navy }}>TVA {opt.label}</div>
              <div style={{ fontSize: 10, color: tvaOption.taux === opt.taux ? 'rgba(255,255,255,0.65)' : C.textSoft, marginTop: 1 }}>{opt.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      {/* Description */}
      <Card>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.navy, marginBottom: 2 }}>{metier.emoji} Décrivez le travail</div>
        <div style={{ fontSize: 12, color: C.textSoft, marginBottom: 10 }}>L'IA génère un devis modifiable</div>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder={PLACEHOLDERS[metier.id] || 'Décrivez le travail...'}
          rows={4}
          style={{ width:'100%', borderRadius:12, padding:'11px 14px', fontSize:14, background:C.surfaceAlt, border:`1.5px solid ${C.border}`, color:C.text, resize:'none', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
        />
        {/* Informations client */}
        <div style={{ marginTop:10, padding:'12px 0', borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:8, textTransform:'uppercase', letterSpacing:'0.06em' }}>Client (optionnel mais recommandé)</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <input type="text" value={clientNom} onChange={e => setClientNom(e.target.value)}
              placeholder="Nom du client - ex: M. Thomas Bernard"
              style={{ width:'100%', borderRadius:10, padding:'9px 12px', fontSize:13, background:C.surfaceAlt, border:`1px solid ${C.border}`, color:C.text, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
            />
            <input type="text" value={clientAdresse} onChange={e => setClientAdresse(e.target.value)}
              placeholder="Adresse du chantier"
              style={{ width:'100%', borderRadius:10, padding:'9px 12px', fontSize:13, background:C.surfaceAlt, border:`1px solid ${C.border}`, color:C.text, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
            />
          </div>
        </div>

        <button onClick={generer} disabled={loading || !description.trim()} style={{
          width:'100%', marginTop:10, padding:'13px 0', borderRadius:12, fontSize:14, fontWeight:800,
          border:'none', fontFamily:'inherit', transition:'all 0.2s',
          cursor: loading || !description.trim() ? 'not-allowed' : 'pointer',
          background: loading || !description.trim() ? C.surfaceAlt : C.navy,
          color: loading || !description.trim() ? C.textSoft : '#fff',
        }}>
          {loading ? '⏳ Génération IA...' : `✨ Générer le devis ${metier.label}`}
        </button>
      </Card>

      {/* ── ÉDITEUR DE DEVIS ── */}
      {devis && (
        <div style={{ background: C.surface, borderRadius: 16, overflow: 'hidden', border: `2px solid ${C.navy}`, boxShadow: '0 4px 20px rgba(27,45,79,0.12)' }}>

          {/* Header éditable */}
          <div style={{ background: C.navy, padding: '14px 16px' }}>
            {editTitre
              ? <input value={titre} onChange={e => setTitre(e.target.value)} onBlur={() => setEditTitre(false)} autoFocus
                  style={{ width:'100%', borderRadius:8, padding:'6px 10px', fontSize:14, fontWeight:700, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', color:'#fff', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
              : <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:14, fontWeight:800, color:'#fff', flex:1, marginRight:8 }}>{titre}</div>
                  <button onClick={() => setEditTitre(true)} style={{ fontSize:11, padding:'4px 8px', borderRadius:6, background:'rgba(255,255,255,0.15)', color:'#fff', border:'none', cursor:'pointer' }}>✏️</button>
                </div>
            }
            <div style={{ display:'flex', gap:6, marginTop:8, alignItems:'center', flexWrap:'wrap' }}>
              <Badge statut="brouillon" />
              <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>TVA {tvaOption.label} - {metier.label}</span>
              {devis?.numero && <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', fontFamily:'monospace' }}>{devis.numero}</span>}
              {autosaveLabel && <span style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginLeft:'auto' }}>✓ {autosaveLabel}</span>}
            </div>
            {clientNom && (
              <div style={{ marginTop:8, fontSize:11, color:'rgba(255,255,255,0.6)', borderTop:'1px solid rgba(255,255,255,0.1)', paddingTop:7 }}>
                👤 {clientNom}{clientAdresse ? ` - ${clientAdresse}` : ''}
              </div>
            )}
          </div>

          <div style={{ padding: 16 }}>
            {/* Lignes éditables */}
            <div style={{ marginBottom: 4 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ fontSize:12, fontWeight:700, color:C.textSoft, textTransform:'uppercase', letterSpacing:'0.06em' }}>Prestations</div>
                <div style={{ fontSize:11, color:C.textSoft }}>👆 Tapez sur une ligne pour modifier</div>
              </div>

              {lignes.map((ligne, i) => (
                <LigneEditable key={i} ligne={ligne} index={i} onChange={modifierLigne} onDelete={supprimerLigne} />
              ))}

              {/* Bouton annuler modifications */}
              {lignesOriginal.length > 0 && (
                <button onClick={annulerModifications} style={{
                  width:'100%', marginTop:4, padding:'7px 0', borderRadius:9, fontSize:11, fontWeight:700,
                  background:'transparent', color:C.textSoft, border:`1px dashed ${C.border}`, cursor:'pointer', fontFamily:'inherit',
                }}>↩️ Revenir au devis IA original</button>
              )}

              {/* Ajouter une ligne */}
              <button onClick={ajouterLigne} style={{
                width:'100%', marginTop:8, padding:'9px 0', borderRadius:10, fontSize:12, fontWeight:700,
                background:C.surfaceAlt, color:C.navy, border:`1.5px dashed ${C.border}`, cursor:'pointer', fontFamily:'inherit',
              }}>+ Ajouter une ligne manuellement</button>

              {/* Bibliothèque de prix */}
              <BibliothequePrix
                user={user}
                metier={metier?.label}
                onSelect={prestation => {
                  setLignes(ls => [...ls, {
                    description: prestation.description,
                    quantite: prestation.quantite || 1,
                    unite: prestation.unite,
                    prixUnitaire: prestation.prixUnitaire,
                  }])
                }}
              />
            </div>

            {/* Totaux recalculés */}
            <div style={{ marginTop:16, borderTop:`2px solid ${C.border}`, paddingTop:12, display:'flex', flexDirection:'column', gap:5 }}>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.textMid }}>
                <span>Total HT</span><span>{totalHT.toLocaleString('fr-FR')} €</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.textMid }}>
                <span>TVA {tvaOption.label}</span>
                <span>{tvaOption.taux === 0 ? 'Non applicable' : `${tva.toLocaleString('fr-FR')} €`}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6, paddingTop:10, borderTop:`2px solid ${C.border}` }}>
                <span style={{ fontSize:15, fontWeight:800, color:C.navy }}>Total TTC</span>
                <span style={{ fontSize:24, fontWeight:800, color:C.orange }}>{totalTTC.toLocaleString('fr-FR')} €</span>
              </div>
            </div>

            {/* Date de validité */}
            <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}`, display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>Validité</div>
              <select value={dateValidite} onChange={e => setDateValidite(Number(e.target.value))}
                style={{ borderRadius:8, padding:'6px 10px', fontSize:12, background:C.surfaceAlt, border:`1px solid ${C.border}`, color:C.text, outline:'none', fontFamily:'inherit' }}>
                {[15,30,45,60,90].map(d => <option key={d} value={d}>{d} jours</option>)}
              </select>
              <div style={{ fontSize:11, color:C.textSoft }}>
                Expire le {new Date(Date.now() + dateValidite*86400000).toLocaleDateString('fr-FR')}
              </div>
            </div>

            {/* 9 - Conditions particulières */}
            <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:6, textTransform:'uppercase', letterSpacing:'0.06em' }}>Conditions particulières</div>
              <textarea
                value={conditionsParticulieres} onChange={e => setConditionsParticulieres(e.target.value)}
                placeholder="Ex: Travaux sous réserve d'accès au tableau. Évacuation des gravats non incluse..."
                rows={3}
                style={{ width:'100%', borderRadius:10, padding:'10px 12px', fontSize:12, background:C.surfaceAlt, border:`1px solid ${C.border}`, color:C.text, resize:'none', outline:'none', fontFamily:'inherit', boxSizing:'border-box', lineHeight:1.5 }}
              />
            </div>

            {/* 10 - Modèle réutilisable */}
            <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:8, cursor:'pointer' }}>
              <input type="checkbox" checked={estModele} onChange={e => setEstModele(e.target.checked)} style={{ width:15, height:15, accentColor:C.navy, cursor:'pointer' }} />
              <span style={{ fontSize:12, color:C.textMid, fontWeight:600 }}>💾 Enregistrer comme modèle réutilisable</span>
            </label>

            {/* Régénérer */}
            <button onClick={generer} disabled={loading} style={{ width:'100%', marginTop:10, padding:'9px 0', borderRadius:10, fontSize:12, fontWeight:700, background:'transparent', color:C.textSoft, border:`1px dashed ${C.border}`, cursor:'pointer', fontFamily:'inherit' }}>
              {loading ? '⏳...' : "🔄 Régénérer avec l'IA"}
            </button>

            {/* Actions principales */}
            <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:8 }}>

              {/* Rangée 1 : PDF + Imprimer + Sauver */}
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={telechargerPDF} style={{ flex:1, padding:'11px 0', borderRadius:12, fontSize:12, fontWeight:700, background:C.surfaceAlt, color:C.navy, border:`1.5px solid ${C.border}`, cursor:'pointer', fontFamily:'inherit' }}>📥 PDF</button>
                <button onClick={() => {
                  const lignesHTML = (lignes||[]).map(l => `<tr><td style="padding:6px 8px;border:1px solid #ddd">${l.description}</td><td style="padding:6px 8px;border:1px solid #ddd;text-align:center">${l.quantite} ${l.unite}</td><td style="padding:6px 8px;border:1px solid #ddd;text-align:right">${((l.quantite||1)*(l.prixUnitaire||0)).toLocaleString('fr-FR')} €</td></tr>`).join('')
                  const w = window.open('', '_blank')
                  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titre}</title></head><body style="font-family:sans-serif;padding:24px;max-width:700px;margin:0 auto"><h1 style="font-size:18px;margin-bottom:4px">${titre}</h1><p style="color:#888;font-size:12px;margin-bottom:20px">Date : ${new Date().toLocaleDateString('fr-FR')} · TVA ${tvaOption.taux}%</p><table style="width:100%;border-collapse:collapse;margin-bottom:16px"><tr style="background:#1B2D4F;color:#fff"><th style="padding:8px;text-align:left;border:1px solid #ddd">Désignation</th><th style="padding:8px;border:1px solid #ddd">Qté / Unité</th><th style="padding:8px;text-align:right;border:1px solid #ddd">Total HT</th></tr>${lignesHTML}</table><p style="text-align:right;font-size:18px;font-weight:bold">Total TTC : ${totalTTC.toLocaleString('fr-FR')} €</p>${conditionsParticulieres ? `<p style="font-size:12px;color:#666;border-top:1px solid #eee;padding-top:12px">${conditionsParticulieres}</p>` : ''}</body></html>`)
                  w.document.close(); w.focus(); w.print()
                }} style={{ flex:1, padding:'11px 0', borderRadius:12, fontSize:12, fontWeight:700, background:C.surfaceAlt, color:C.navy, border:`1.5px solid ${C.border}`, cursor:'pointer', fontFamily:'inherit' }}>🖨️ Imprimer</button>
                <button onClick={sauvegarder} disabled={saving} style={{ flex:1, padding:'11px 0', borderRadius:12, fontSize:12, fontWeight:700, background:C.navyLight, color:'#fff', border:'none', cursor:saving?'not-allowed':'pointer', fontFamily:'inherit' }}>{saving ? '⏳' : '💾 Sauver'}</button>
              </div>

              {/* Lien de partage - apparaît après sauvegarde */}
              {lienPartage && (
                <div style={{ background:'#EBF4FF', border:'1px solid #BFDBFE', borderRadius:12, padding:'10px 12px', display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:12, color:'#1D4ED8', fontWeight:600, flexShrink:0 }}>🔗 Lien client :</span>
                  <div style={{ flex:1, fontSize:11, color:'#3B82F6', fontFamily:'monospace', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{lienPartage}</div>
                  <button onClick={() => { navigator.clipboard?.writeText(lienPartage); setToast({ message: '🔗 Lien copié !', type: 'success' }) }} style={{ padding:'4px 10px', borderRadius:8, fontSize:11, fontWeight:700, background:'#2563EB', color:'#fff', border:'none', cursor:'pointer', flexShrink:0 }}>Copier</button>
                </div>
              )}

              {/* Rangée 2 : Email client */}
              {!showEmail
                ? <button onClick={() => setShowEmail(true)} style={{ width:'100%', padding:'13px 0', borderRadius:12, fontSize:14, fontWeight:800, background:C.orange, color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 16px rgba(232,101,10,0.3)' }}>
                    📧 Envoyer par email au client
                  </button>
                : <div style={{ background:C.surfaceAlt, borderRadius:12, padding:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:C.textMid, marginBottom:6 }}>Email du client</div>
                    <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.fr" autoFocus
                      style={{ width:'100%', borderRadius:10, padding:'10px 12px', fontSize:13, background:C.surface, border:`1.5px solid ${C.border}`, color:C.text, outline:'none', fontFamily:'inherit', boxSizing:'border-box', marginBottom:8 }} />
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={envoyerEmail} disabled={sending||!clientEmail} style={{ flex:1, padding:'10px 0', borderRadius:10, fontSize:13, fontWeight:700, background:sending||!clientEmail?C.border:C.orange, color:sending||!clientEmail?C.textSoft:'#fff', border:'none', cursor:sending||!clientEmail?'not-allowed':'pointer', fontFamily:'inherit' }}>
                        {sending ? 'Envoi...' : '📤 Envoyer'}
                      </button>
                      <button onClick={() => setShowEmail(false)} style={{ padding:'10px 14px', borderRadius:10, background:C.surface, color:C.textSoft, border:`1px solid ${C.border}`, cursor:'pointer' }}>✕</button>
                    </div>
                  </div>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
