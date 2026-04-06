'use client'
import React, { useState, useEffect } from 'react'

// Page publique : devios.fr/devis/[id]
// Passe par l'API route pour bypasser le RLS Supabase
export default function DevisPublic({ params }) {
  const [devis, setDevis]   = useState(null)
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    const charger = async () => {
      try {
        const res = await fetch(`/api/devis-public?id=${params.id}`)
        if (!res.ok) { setErreur(true); return }
        const data = await res.json()
        if (!data.devis) { setErreur(true); return }
        setDevis(data.devis)
        setProfil(data.profil)
      } catch { setErreur(true) }
      finally { setLoading(false) }
    }
    charger()
  }, [params.id])

  const C = {
    navy:'#1B2D4F', orange:'#E8650A', bg:'#F7F4EF',
    surface:'#fff', border:'#E0DDD6', mid:'#4A5568', soft:'#9CA3AF',
    green:'#2D7D46', greenL:'#EBF7EE', red:'#C0392B',
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif' }}>
      <div style={{ color:C.soft, fontSize:14 }}>Chargement du devis...</div>
    </div>
  )

  if (erreur || !devis) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif', padding:20 }}>
      <div style={{ fontSize:48, marginBottom:16 }}>404</div>
      <div style={{ fontSize:18, fontWeight:800, color:C.navy, marginBottom:8 }}>Devis introuvable</div>
      <div style={{ fontSize:14, color:C.soft }}>Ce lien est invalide ou le devis a ete supprime.</div>
    </div>
  )

  const lignes = devis.lignes || []
  const tva = devis.taux_tva || 10
  const totalHT = lignes.reduce((s, l) => s + (l.quantite||1)*(l.prixUnitaire||0), 0)
  const montantTVA = Math.round(totalHT * tva / 100 * 100) / 100
  const totalTTC = Math.round((totalHT + montantTVA) * 100) / 100

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'sans-serif', padding:'0 0 40px' }}>

      <div style={{ background:C.navy, padding:'20px 20px' }}>
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{profil?.raison_sociale || 'Artisan'}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,0.55)', marginTop:3 }}>
            {[profil?.adresse, profil?.tel, profil?.email].filter(Boolean).join(' - ')}
          </div>
          {profil?.siret && <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:2 }}>SIRET : {profil.siret}</div>}
        </div>
      </div>

      <div style={{ maxWidth:560, margin:'0 auto', padding:'20px 16px' }}>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:'16px', marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
            <div style={{ fontSize:16, fontWeight:800, color:C.navy, flex:1, marginRight:10 }}>{devis.titre}</div>
            {devis.numero && <div style={{ fontSize:12, fontWeight:700, color:C.soft, fontFamily:'monospace', flexShrink:0 }}>{devis.numero}</div>}
          </div>
          <div style={{ fontSize:12, color:C.soft }}>
            Date : {new Date(devis.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}
            {' - '}Validite : {devis.date_validite || 30} jours
            {' - '}TVA : {tva}%
          </div>
          {devis.client_nom && (
            <div style={{ marginTop:10, padding:'10px 12px', background:C.bg, borderRadius:10, fontSize:12 }}>
              <div style={{ fontWeight:700, color:C.navy }}>{devis.client_nom}</div>
              {devis.client_adresse && <div style={{ color:C.soft, marginTop:2 }}>{devis.client_adresse}</div>}
            </div>
          )}
        </div>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, overflow:'hidden', marginBottom:14 }}>
          <div style={{ background:C.navy, padding:'10px 16px', display:'grid', gridTemplateColumns:'1fr 60px 70px 80px', gap:4 }}>
            {['Designation','Qte','Unite','Total HT'].map(h => (
              <div key={h} style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.65)', textTransform:'uppercase', textAlign: h !== 'Designation' ? 'right' : 'left' }}>{h}</div>
            ))}
          </div>
          {lignes.map((l, i) => {
            const t = Math.round((l.quantite||1)*(l.prixUnitaire||0)*100)/100
            return (
              <div key={i} style={{ padding:'10px 16px', borderBottom:`1px solid ${C.border}`, display:'grid', gridTemplateColumns:'1fr 60px 70px 80px', gap:4, background: i%2 ? C.bg : C.surface }}>
                <div style={{ fontSize:12, color:C.mid }}>{l.description}</div>
                <div style={{ fontSize:12, color:C.mid, textAlign:'right' }}>{l.quantite}</div>
                <div style={{ fontSize:12, color:C.soft, textAlign:'right' }}>{l.unite}</div>
                <div style={{ fontSize:12, fontWeight:700, color:C.navy, textAlign:'right' }}>{t.toLocaleString('fr-FR')} EUR</div>
              </div>
            )
          })}
        </div>

        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:16, marginBottom:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.soft, marginBottom:6 }}>
            <span>Total HT</span><span>{totalHT.toLocaleString('fr-FR')} EUR</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.soft, marginBottom:10 }}>
            <span>TVA {tva}%</span><span>{montantTVA.toLocaleString('fr-FR')} EUR</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:12, borderTop:`2px solid ${C.navy}` }}>
            <span style={{ fontSize:16, fontWeight:800, color:C.navy }}>Total TTC</span>
            <span style={{ fontSize:28, fontWeight:800, color:C.orange }}>{totalTTC.toLocaleString('fr-FR')} EUR</span>
          </div>
        </div>

        {profil?.assurance_nom && (
          <div style={{ background:'#F0FDF4', border:`1px solid #86EFAC`, borderRadius:14, padding:14, marginBottom:14, fontSize:12, color:'#166534', lineHeight:1.6 }}>
            <strong>Assurance decennale :</strong> {profil.assurance_nom}
            {profil.assurance_police && ` - Police n${profil.assurance_police}`}
          </div>
        )}

        <SignatureBlock devisId={params.id} />

        <div style={{ textAlign:'center', marginTop:20, fontSize:11, color:C.soft }}>
          Devis genere par <strong>Devios</strong> - devios.fr
        </div>
      </div>
    </div>
  )
}

function SignatureBlock({ devisId }) {
  const [signed, setSigned]   = useState(false)
  const [signing, setSigning] = useState(false)
  const [nom, setNom]         = useState('')
  const [done, setDone]       = useState(false)
  const [checked, setChecked] = useState(false)
  const canvasRef             = React.useRef(null)
  const drawing               = React.useRef(false)
  const C = { navy:'#1B2D4F', orange:'#E8650A', bg:'#F7F4EF', white:'#fff', border:'#E0DDD6', soft:'#9CA3AF', green:'#2D7D46', red:'#C0392B' }

  useEffect(() => {
    fetch(`/api/signer?devisId=${devisId}`)
      .then(r => r.json()).then(d => { if (d.signed) setSigned(true) }).catch(() => {})
  }, [devisId])

  const startDraw = (e) => {
    drawing.current = true
    const c = canvasRef.current; const r = c.getBoundingClientRect()
    const x = (e.touches?.[0]?.clientX || e.clientX) - r.left
    const y = (e.touches?.[0]?.clientY || e.clientY) - r.top
    const ctx = c.getContext('2d'); ctx.beginPath(); ctx.moveTo(x, y)
  }
  const draw = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const c = canvasRef.current; const r = c.getBoundingClientRect()
    const x = (e.touches?.[0]?.clientX || e.clientX) - r.left
    const y = (e.touches?.[0]?.clientY || e.clientY) - r.top
    const ctx = c.getContext('2d')
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = '#1B2D4F'
    ctx.lineTo(x, y); ctx.stroke()
  }
  const stopDraw = () => { drawing.current = false }
  const effacer = () => {
    const c = canvasRef.current
    c.getContext('2d').clearRect(0, 0, c.width, c.height)
  }

  const signer = async () => {
    const c = canvasRef.current
    const blank = document.createElement('canvas')
    blank.width = c.width; blank.height = c.height
    if (c.toDataURL() === blank.toDataURL()) { alert('Veuillez dessiner votre signature'); return }
    if (!checked) { alert('Veuillez cocher la case'); return }
    setSigning(true)
    try {
      const res = await fetch('/api/signer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId, signatureData: c.toDataURL(), nomSignataire: nom })
      })
      const d = await res.json()
      if (d.error) throw new Error(d.error)
      setDone(true); setSigned(true)
    } catch(e) { alert('Erreur : ' + e.message) }
    setSigning(false)
  }

  if (done) return (
    <div style={{ background:'#EBF7EE', border:'2px solid #86EFAC', borderRadius:16, padding:24, textAlign:'center', marginBottom:14 }}>
      <div style={{ fontSize:40, marginBottom:8 }}>✅</div>
      <div style={{ fontSize:16, fontWeight:800, color:C.green }}>Devis signe electroniquement</div>
      <div style={{ fontSize:12, color:'#166534', marginTop:4 }}>
        Signe le {new Date().toLocaleDateString('fr-FR')}{nom ? ` par ${nom}` : ''}
      </div>
    </div>
  )

  if (signed) return (
    <div style={{ background:'#EBF7EE', border:'1px solid #86EFAC', borderRadius:16, padding:20, textAlign:'center', marginBottom:14 }}>
      <div style={{ fontSize:14, fontWeight:700, color:C.green }}>✅ Ce devis a deja ete signe</div>
    </div>
  )

  return (
    <div style={{ background:C.white, border:`2px solid ${C.border}`, borderRadius:16, padding:20, marginBottom:14 }}>
      <div style={{ fontSize:14, fontWeight:800, color:C.navy, marginBottom:4 }}>Signer ce devis</div>
      <div style={{ fontSize:11, color:C.soft, marginBottom:14, lineHeight:1.5 }}>
        "Devis recu avant execution des travaux, lu et accepte, bon pour accord"
      </div>
      <input type="text" placeholder="Votre nom complet" value={nom} onChange={e => setNom(e.target.value)}
        style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:14, marginBottom:10, boxSizing:'border-box', outline:'none' }}/>
      <div style={{ fontSize:11, fontWeight:700, color:C.soft, marginBottom:6 }}>Votre signature :</div>
      <canvas ref={canvasRef} width={320} height={120}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
        style={{ width:'100%', height:120, border:`1.5px solid ${C.border}`, borderRadius:10, background:'#FAFAFA', touchAction:'none', cursor:'crosshair', display:'block' }}
      />
      <button onClick={effacer} style={{ fontSize:11, color:C.soft, background:'none', border:'none', cursor:'pointer', padding:'4px 0', marginBottom:10 }}>
        Effacer
      </button>
      <label style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:14, cursor:'pointer' }}>
        <input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} style={{ marginTop:2, flexShrink:0 }}/>
        <span style={{ fontSize:11, color:C.soft, lineHeight:1.5 }}>
          J'accepte ce devis et autorise l'artisan a demarrer les travaux.
        </span>
      </label>
      <button onClick={signer} disabled={signing || !nom || !checked}
        style={{ width:'100%', padding:13, borderRadius:12, background:signing||!nom||!checked?'#E0DDD6':'#2D7D46', color:signing||!nom||!checked?C.soft:'#fff', border:'none', fontSize:14, fontWeight:800, cursor:'pointer' }}>
        {signing ? 'Signature...' : 'Signer et accepter le devis'}
      </button>
    </div>
  )
}
