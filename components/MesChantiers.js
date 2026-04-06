'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C, Card } from './ui'

const STATUTS = [
  { val:'planifie', label:'Planifié', color:'#2563EB', bg:'#EBF4FF' },
  { val:'en_cours', label:'En cours', color:'#D97706', bg:'#FEF3C7' },
  { val:'termine', label:'Terminé', color:'#2D7D46', bg:'#EBF7EE' },
  { val:'annule', label:'Annulé', color:'#C0392B', bg:'#FEF2F2' },
]

export default function MesChantiers({ user, setToast }) {
  const [chantiers, setChantiers] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ client_nom:'', adresse:'', statut:'planifie', date_debut:'', date_fin_prevue:'', notes:'' })
  const [saving, setSaving]       = useState(false)
  const [filterStatut, setFilter] = useState('tous')

  const charger = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('chantiers').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    setChantiers(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { charger() }, [charger])

  const sauvegarder = async () => {
    if (!form.client_nom?.trim()) return
    setSaving(true)
    try {
      if (form.id) {
        await supabase.from('chantiers').update({ ...form }).eq('id', form.id)
      } else {
        await supabase.from('chantiers').insert({ ...form, user_id: user.id })
      }
      setToast({ message: '✅ Chantier sauvegardé !', type: 'success' })
      setShowForm(false); setForm({ client_nom:'', adresse:'', statut:'planifie', date_debut:'', date_fin_prevue:'', notes:'' })
      charger()
    } catch(e) { setToast({ message:'❌ '+e.message, type:'error' }) }
    setSaving(false)
  }

  const changerStatut = async (id, statut) => {
    const update = { statut }
    if (statut === 'en_cours') update.date_debut = new Date().toISOString().slice(0,10)
    if (statut === 'termine') update.date_fin_reelle = new Date().toISOString().slice(0,10)
    await supabase.from('chantiers').update(update).eq('id', id)
    charger()
    setToast({ message: `✅ Chantier ${statut === 'termine' ? 'terminé' : 'mis à jour'} !`, type: 'success' })
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer ce chantier ?')) return
    await supabase.from('chantiers').delete().eq('id', id)
    setToast({ message: '🗑️ Chantier supprimé', type: 'success' })
    charger()
  }

  const filtered = filterStatut === 'tous' ? chantiers : chantiers.filter(c => c.statut === filterStatut)

  const getStatut = (val) => STATUTS.find(s => s.val === val) || STATUTS[0]

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:16, fontWeight:800, color:C.navy }}>Mes chantiers ({chantiers.length})</div>
        <button onClick={() => { setForm({ client_nom:'', adresse:'', statut:'planifie', date_debut:'', date_fin_prevue:'', notes:'' }); setShowForm(true) }}
          style={{ padding:'8px 14px', borderRadius:10, background:C.navy, color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          + Nouveau
        </button>
      </div>

      {/* Filtres statut */}
      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
        {['tous', ...STATUTS.map(s => s.val)].map(s => {
          const st = STATUTS.find(x => x.val === s)
          return (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding:'5px 10px', borderRadius:99, fontSize:11, fontWeight:700, border:'none', cursor:'pointer',
              background: filterStatut === s ? C.navy : C.surfaceAlt,
              color: filterStatut === s ? '#fff' : C.textMid,
            }}>{s === 'tous' ? 'Tous' : st?.label}</button>
          )
        })}
      </div>

      {/* Formulaire */}
      {showForm && (
        <Card>
          <div style={{ fontSize:14, fontWeight:800, color:C.navy, marginBottom:12 }}>
            {form.id ? 'Modifier' : 'Nouveau chantier'}
          </div>
          {[
            { k:'client_nom', l:'Client *', ph:'M. Bernard Thomas', type:'text' },
            { k:'adresse', l:'Adresse du chantier', ph:'12 rue de la Paix, 75001 Paris', type:'text' },
          ].map(f => (
            <div key={f.k} style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:4 }}>{f.l}</div>
              <input type={f.type} value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:14, background:C.surfaceAlt, outline:'none', boxSizing:'border-box' }}/>
            </div>
          ))}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:4 }}>Date début</div>
              <input type="date" value={form.date_debut||''} onChange={e=>setForm(p=>({...p,date_debut:e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, background:C.surfaceAlt, outline:'none', boxSizing:'border-box' }}/>
            </div>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:4 }}>Date fin prévue</div>
              <input type="date" value={form.date_fin_prevue||''} onChange={e=>setForm(p=>({...p,date_fin_prevue:e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, background:C.surfaceAlt, outline:'none', boxSizing:'border-box' }}/>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:4 }}>Notes</div>
            <textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Remarques, accès, matériaux..." rows={2}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, background:C.surfaceAlt, outline:'none', resize:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={sauvegarder} disabled={saving||!form.client_nom?.trim()}
              style={{ flex:1, padding:'11px 0', borderRadius:12, background:C.navy, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {saving?'...':'💾 Sauvegarder'}
            </button>
            <button onClick={()=>setShowForm(false)}
              style={{ padding:'11px 16px', borderRadius:12, background:C.surfaceAlt, color:C.navy, border:`1px solid ${C.border}`, cursor:'pointer' }}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Liste */}
      {loading && <div style={{ textAlign:'center', padding:'32px', color:C.textSoft }}>Chargement...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:C.textSoft, fontSize:13 }}>Aucun chantier</div>
      )}

      {filtered.map(c => {
        const st = getStatut(c.statut)
        return (
          <Card key={c.id}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{c.client_nom}</div>
                {c.adresse && <div style={{ fontSize:11, color:C.textSoft, marginTop:2 }}>📍 {c.adresse}</div>}
                {c.date_debut && <div style={{ fontSize:11, color:C.textSoft, marginTop:2 }}>
                  📅 {new Date(c.date_debut).toLocaleDateString('fr-FR')}
                  {c.date_fin_prevue && ` → ${new Date(c.date_fin_prevue).toLocaleDateString('fr-FR')}`}
                </div>}
              </div>
              <span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:99, background:st.bg, color:st.color }}>
                {st.label}
              </span>
            </div>

            {c.notes && <div style={{ fontSize:11, color:C.textMid, marginBottom:8, padding:'8px 10px', background:C.surfaceAlt, borderRadius:8, lineHeight:1.5 }}>{c.notes}</div>}

            {/* Actions statut */}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {c.statut === 'planifie' && (
                <button onClick={() => changerStatut(c.id, 'en_cours')}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700, background:'#FEF3C7', color:'#D97706', border:'none', cursor:'pointer' }}>
                  ▶️ Démarrer
                </button>
              )}
              {c.statut === 'en_cours' && (
                <button onClick={() => changerStatut(c.id, 'termine')}
                  style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700, background:'#EBF7EE', color:'#2D7D46', border:'none', cursor:'pointer' }}>
                  ✅ Terminer
                </button>
              )}
              <button onClick={() => { setForm({...c}); setShowForm(true) }}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700, background:C.surfaceAlt, color:C.navy, border:`1px solid ${C.border}`, cursor:'pointer' }}>
                ✏️ Modifier
              </button>
              <button onClick={() => supprimer(c.id)}
                style={{ padding:'6px 12px', borderRadius:8, fontSize:11, fontWeight:700, background:'#FEF2F2', color:C.red, border:'none', cursor:'pointer' }}>
                🗑️
              </button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
