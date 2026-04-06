'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C, Card, Toast } from './ui'

export default function MesClients({ user, setToast }) {
  const [clients, setClients]   = useState([])
  const [selected, setSelected] = useState(null)
  const [devisClient, setDevisClient] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState({ nom:'', email:'', telephone:'', adresse:'', notes:'' })
  const [saving, setSaving]     = useState(false)
  const [search, setSearch]     = useState('')

  const charger = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*')
      .eq('user_id', user.id).order('nom')
    setClients(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { charger() }, [charger])

  const voirClient = async (client) => {
    setSelected(client)
    const { data } = await supabase.from('devis').select('*')
      .eq('user_id', user.id)
      .or(`client_nom.ilike.%${client.nom}%,client_email.eq.${client.email || 'none'}`)
      .order('created_at', { ascending: false })
    setDevisClient(data || [])
  }

  const sauvegarder = async () => {
    if (!form.nom.trim()) return
    setSaving(true)
    try {
      if (form.id) {
        await supabase.from('clients').update({ ...form }).eq('id', form.id)
      } else {
        await supabase.from('clients').insert({ ...form, user_id: user.id })
      }
      setToast({ message: '✅ Client sauvegardé !', type: 'success' })
      setShowForm(false); setForm({ nom:'', email:'', telephone:'', adresse:'', notes:'' })
      charger()
    } catch (e) { setToast({ message: '❌ ' + e.message, type: 'error' }) }
    setSaving(false)
  }

  const supprimer = async (id) => {
    if (!confirm('Supprimer ce client ?')) return
    await supabase.from('clients').delete().eq('id', id)
    setToast({ message: '🗑️ Client supprimé', type: 'success' })
    charger()
  }

  const filtered = clients.filter(c =>
    c.nom?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const totalCA = (devis) => devis.filter(d => d.statut === 'accepté')
    .reduce((s, d) => s + (d.total_ttc || 0), 0)

  if (selected) return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <button onClick={() => setSelected(null)} style={{ fontSize:13, fontWeight:700, color:C.navy, background:'none', border:'none', cursor:'pointer', textAlign:'left', padding:0 }}>
        &lt; Retour
      </button>

      {/* Fiche client */}
      <Card>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:C.navy }}>{selected.nom}</div>
            {selected.email && <div style={{ fontSize:13, color:C.textSoft, marginTop:3 }}>✉️ {selected.email}</div>}
            {selected.telephone && <div style={{ fontSize:13, color:C.textSoft, marginTop:2 }}>📞 {selected.telephone}</div>}
            {selected.adresse && <div style={{ fontSize:13, color:C.textSoft, marginTop:2 }}>📍 {selected.adresse}</div>}
          </div>
          <button onClick={() => { setForm({...selected}); setShowForm(true) }}
            style={{ fontSize:12, padding:'5px 10px', borderRadius:8, background:C.surfaceAlt, color:C.navy, border:`1px solid ${C.border}`, cursor:'pointer' }}>
            ✏️ Modifier
          </button>
        </div>
        {selected.notes && (
          <div style={{ marginTop:12, padding:'10px 12px', background:C.surfaceAlt, borderRadius:10, fontSize:12, color:C.textMid, lineHeight:1.5 }}>
            {selected.notes}
          </div>
        )}
      </Card>

      {/* Stats client */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {[
          { label:'Devis total', val: devisClient.length, icon:'📋' },
          { label:'CA accepté', val: totalCA(devisClient).toLocaleString('fr-FR') + ' €', icon:'💰' },
          { label:'Acceptés', val: devisClient.filter(d=>d.statut==='accepté').length, icon:'✅' },
          { label:'En attente', val: devisClient.filter(d=>d.statut==='envoyé').length, icon:'⏳' },
        ].map(s => (
          <Card key={s.label}>
            <div style={{ fontSize:20, marginBottom:4 }}>{s.icon}</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.navy }}>{s.val}</div>
            <div style={{ fontSize:11, color:C.textSoft }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Historique devis */}
      <div style={{ fontSize:14, fontWeight:800, color:C.navy }}>Historique des devis</div>
      {devisClient.length === 0 && (
        <div style={{ textAlign:'center', padding:'24px 0', color:C.textSoft, fontSize:13 }}>
          Aucun devis trouvé pour ce client
        </div>
      )}
      {devisClient.map(d => (
        <Card key={d.id}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.navy }}>{d.titre}</div>
              <div style={{ fontSize:11, color:C.textSoft, marginTop:2 }}>
                {d.metier} - {new Date(d.created_at).toLocaleDateString('fr-FR')}
              </div>
              {d.numero && <div style={{ fontSize:10, color:C.textSoft, fontFamily:'monospace' }}>{d.numero}</div>}
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:15, fontWeight:800, color:C.orange }}>{d.total_ttc?.toLocaleString('fr-FR')} €</div>
              <div style={{ fontSize:10, padding:'2px 7px', borderRadius:99, background:'#EBF4FF', color:'#2563EB', fontWeight:700, display:'inline-block', marginTop:3 }}>{d.statut}</div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ fontSize:16, fontWeight:800, color:C.navy }}>Mes clients ({clients.length})</div>
        <button onClick={() => { setForm({ nom:'', email:'', telephone:'', adresse:'', notes:'' }); setShowForm(true) }}
          style={{ padding:'8px 14px', borderRadius:10, background:C.navy, color:'#fff', border:'none', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          + Nouveau client
        </button>
      </div>

      {/* Recherche */}
      <input type="text" placeholder="Rechercher un client..." value={search} onChange={e=>setSearch(e.target.value)}
        style={{ width:'100%', padding:'10px 14px', borderRadius:12, border:`1px solid ${C.border}`, fontSize:14, background:'#fff', outline:'none', boxSizing:'border-box' }}/>

      {/* Formulaire */}
      {showForm && (
        <Card>
          <div style={{ fontSize:14, fontWeight:800, color:C.navy, marginBottom:12 }}>
            {form.id ? 'Modifier le client' : 'Nouveau client'}
          </div>
          {[
            { k:'nom', l:'Nom *', ph:'M. Bernard Thomas', type:'text' },
            { k:'email', l:'Email', ph:'client@email.fr', type:'email' },
            { k:'telephone', l:'Téléphone', ph:'06 12 34 56 78', type:'tel' },
            { k:'adresse', l:'Adresse', ph:'12 rue de la Paix, 75001 Paris', type:'text' },
          ].map(f => (
            <div key={f.k} style={{ marginBottom:10 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:4 }}>{f.l}</div>
              <input type={f.type} value={form[f.k]||''} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph}
                style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:14, background:C.surfaceAlt, outline:'none', boxSizing:'border-box' }}/>
            </div>
          ))}
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textSoft, marginBottom:4 }}>Notes</div>
            <textarea value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Notes internes..." rows={2}
              style={{ width:'100%', padding:'10px 12px', borderRadius:10, border:`1px solid ${C.border}`, fontSize:13, background:C.surfaceAlt, outline:'none', resize:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={sauvegarder} disabled={saving||!form.nom?.trim()}
              style={{ flex:1, padding:'11px 0', borderRadius:12, background:saving||!form.nom?.trim()?C.border:C.navy, color:'#fff', border:'none', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              {saving ? '...' : '💾 Sauvegarder'}
            </button>
            <button onClick={() => setShowForm(false)}
              style={{ padding:'11px 16px', borderRadius:12, background:C.surfaceAlt, color:C.navy, border:`1px solid ${C.border}`, cursor:'pointer' }}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {/* Liste clients */}
      {loading && <div style={{ textAlign:'center', padding:'32px', color:C.textSoft }}>Chargement...</div>}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 0', color:C.textSoft, fontSize:13 }}>
          {search ? 'Aucun client trouvé' : 'Aucun client - créez-en un !'}
        </div>
      )}
      {filtered.map(client => (
        <Card key={client.id} style={{ cursor:'pointer' }} onClick={() => voirClient(client)}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:C.navy }}>{client.nom}</div>
              <div style={{ fontSize:11, color:C.textSoft, marginTop:2 }}>
                {[client.email, client.telephone].filter(Boolean).join(' - ')}
              </div>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:12, color:C.textSoft }}>Voir &gt;</span>
              <button onClick={e => { e.stopPropagation(); supprimer(client.id) }}
                style={{ padding:'4px 8px', borderRadius:7, background:'#FEF2F2', color:C.red, border:'none', cursor:'pointer', fontSize:11 }}>
                🗑️
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
