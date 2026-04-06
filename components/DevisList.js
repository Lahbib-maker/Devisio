'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { C, Badge } from './ui'

const STATUTS = ['brouillon', 'envoyé', 'accepté', 'refusé']

export default function DevisList({ refresh, setToast }) {
  const [list, setList]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [converting, setConverting] = useState(null)
  const [acompting, setAcompting]   = useState(null)
  const [search, setSearch]         = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterMetier, setFilterMetier] = useState('tous')
  const [sortBy, setSortBy]         = useState('date')
  const [darkMode, setDarkMode]     = useState(false)
  const [emailsRelance, setEmailsRelance] = useState({})
  const [showEmailFor, setShowEmailFor]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [page, setPage]                   = useState(1)
  const PAGE_SIZE = 10 // id à supprimer

  // Détection mode sombre système
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDarkMode(mq.matches)
    mq.addEventListener('change', e => setDarkMode(e.matches))
    return () => mq.removeEventListener('change', e => setDarkMode(e.matches))
  }, [])

  const bg      = darkMode ? '#0F1623' : C.bg
  const surface = darkMode ? '#1A2535' : C.surface
  const border_ = darkMode ? '#2A3A50' : C.border
  const textNav = darkMode ? '#E2E8F0' : C.navy
  const textMid = darkMode ? '#94A3B8' : C.textMid
  const textSoft= darkMode ? '#64748B' : C.textSoft

  const charger = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('devis')
      .select('*, factures(id, numero)')
      .order('created_at', { ascending: false })
    if (!error) setList(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { charger() }, [charger, refresh])

  // Filtrage + recherche + tri
  const metiers = useMemo(() => ['tous', ...new Set(list.map(d => d.metier).filter(Boolean))], [list])

  // Reset page quand les filtres changent
  useEffect(() => { setPage(1) }, [search, filterStatut, filterMetier, sortBy])

  const filtered = useMemo(() => {
    let r = list
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(d => d.titre?.toLowerCase().includes(q) || d.metier?.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q))
    }
    if (filterStatut !== 'tous') r = r.filter(d => d.statut === filterStatut)
    if (filterMetier !== 'tous') r = r.filter(d => d.metier === filterMetier)
    if (sortBy === 'montant') r = [...r].sort((a, b) => (b.total_ttc || 0) - (a.total_ttc || 0))
    return r
  }, [list, search, filterStatut, filterMetier, sortBy])

  const demanderConfirmation = (id) => setConfirmDelete(id)

  const supprimer = async (id) => {
    setConfirmDelete(null)
    const { error } = await supabase.from('devis').delete().eq('id', id)
    if (error) { setToast({ message: `❌ ${error.message}`, type: 'error' }); return }
    setToast({ message: '🗑️ Devis supprimé', type: 'success' })
    charger()
  }

  const changerStatut = async (id, statut) => {
    await supabase.from('devis').update({ statut }).eq('id', id)
    charger()
  }

  const dupliquer = async (d) => {
    const { error } = await supabase.from('devis').insert({
      user_id: d.user_id,
      titre: `${d.titre} (copie)`,
      description: d.description,
      lignes: d.lignes,
      total_ttc: d.total_ttc,
      taux_tva: d.taux_tva,
      metier: d.metier,
      statut: 'brouillon',
    })
    if (error) { setToast({ message: `❌ ${error.message}`, type: 'error' }); return }
    setToast({ message: '📋 Devis dupliqué !', type: 'success' })
    charger()
  }

  const convertirEnFacture = async (d) => {
    setConverting(d.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/facture', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId: d.id, userId: user.id })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setToast({ message: `✅ Facture ${data.facture.numero} créée !`, type: 'success' })
      charger()
    } catch (e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
    finally { setConverting(null) }
  }

  const creerAcompte = async (d) => {
    setAcompting(d.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const res = await fetch('/api/acompte', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId: d.id, userId: user.id, pourcentage: 30 })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setToast({ message: `✅ Acompte 30% (${data.montantAcompte?.toLocaleString('fr-FR')} €) + Solde créés !`, type: 'success' })
      charger()
    } catch (e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
    finally { setAcompting(null) }
  }

  const exporter = async (type) => {
    const { data: { user } } = await supabase.auth.getUser()
    const url = `/api/export?userId=${user.id}&type=${type}`
    window.open(url, '_blank')
    setToast({ message: `📊 Export ${type} en cours...`, type: 'success' })
  }

  const formatOuvert = (date) => {
    if (!date) return null
    const diff = Math.floor((Date.now() - new Date(date)) / 60000)
    if (diff < 60) return `il y a ${diff} min`
    if (diff < 1440) return `il y a ${Math.floor(diff / 60)}h`
    return `le ${new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
  }

  const totalAccepte = list.filter(d => d.statut === 'accepté').reduce((s, d) => s + (d.total_ttc || 0), 0)

  const exporterCSV = () => {
    const headers = ['Numéro','Titre','Client','Métier','Statut','Total TTC','TVA %','Date']
    const rows = filtered.map(d => [
      d.numero || '',
      d.titre || '',
      d.client_nom || '',
      d.metier || '',
      d.statut || '',
      d.total_ttc || 0,
      d.taux_tva || '',
      new Date(d.created_at).toLocaleDateString('fr-FR'),
    ])
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `devios-export-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }
  const taux = list.length ? Math.round(list.filter(d => d.statut === 'accepté').length / list.length * 100) : 0
  const nbOuverts = list.filter(d => d.ouvert_le).length

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '56px 0', color: textSoft, fontSize: 14 }}>Chargement...</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'CA accepté',    value: `${totalAccepte.toLocaleString('fr-FR')} €`, color: C.green },
          { label: 'Taux accept.',  value: `${taux}%`,                                  color: textNav },
          { label: 'Ouverts',       value: nbOuverts,                                   color: C.orange },
        ].map(s => (
          <div key={s.label} style={{ background: surface, border: `1px solid ${border_}`, borderRadius: 12, padding: '10px 11px', boxShadow: '0 1px 3px rgba(27,45,79,0.06)' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: textSoft, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div style={{ position: 'relative' }}>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher un devis..."
          style={{
            width: '100%', borderRadius: 12, padding: '10px 14px', fontSize: 13,
            background: surface, border: `1.5px solid ${search ? C.navy : border_}`,
            color: textNav, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: textSoft }}>✕</button>
        )}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: surface, border: `1px solid ${border_}`, color: textNav, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
          <option value="tous">Tous statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterMetier} onChange={e => setFilterMetier(e.target.value)} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: surface, border: `1px solid ${border_}`, color: textNav, outline: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
          {metiers.map(m => <option key={m} value={m}>{m === 'tous' ? 'Tous métiers' : m}</option>)}
        </select>
        <button onClick={() => setSortBy(s => s === 'date' ? 'montant' : 'date')} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: C.navy, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          {sortBy === 'date' ? '📅 Date' : '💶 Montant'}
        </button>
        <button onClick={() => exporter('devis')} style={{ padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: surface, color: textNav, border: `1px solid ${border_}`, cursor: 'pointer', fontFamily: 'inherit', marginLeft: 'auto' }}>
          📊 Export CSV
        </button>
      </div>

      {/* Résultats + Export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: textNav }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%' }}>
            <span>{filtered.length} devis{search && ` pour "${search}"`}</span>
            {filtered.length > 0 && (
              <button onClick={exporterCSV} style={{ fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:8, background:C.surfaceAlt, color:C.textMid, border:`1px solid ${C.border}`, cursor:'pointer', fontFamily:'inherit' }}>
                📊 Export CSV
              </button>
            )}
          </div>
        </span>
        <button onClick={charger} style={{ fontSize: 11, color: textSoft, background: 'none', border: 'none', cursor: 'pointer' }}>↺</button>
      </div>

      {/* Modale confirmation suppression */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(27,45,79,0.6)', backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 20px' }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: surface, borderRadius:20, padding:24, maxWidth:340, width:'100%', boxShadow:'0 8px 40px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:32, textAlign:'center', marginBottom:12 }}>🗑️</div>
            <div style={{ fontSize:16, fontWeight:800, color:textNav, textAlign:'center', marginBottom:8 }}>Supprimer ce devis ?</div>
            <div style={{ fontSize:13, color:textMid, textAlign:'center', marginBottom:20, lineHeight:1.5 }}>Cette action est irréversible. Le devis sera définitivement supprimé.</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex:1, padding:'11px 0', borderRadius:12, fontSize:13, fontWeight:700, background: surface, color:textNav, border:`1.5px solid ${border_}`, cursor:'pointer', fontFamily:'inherit' }}>Annuler</button>
              <button onClick={() => supprimer(confirmDelete)} style={{ flex:1, padding:'11px 0', borderRadius:12, fontSize:13, fontWeight:700, background:C.red, color:'#fff', border:'none', cursor:'pointer', fontFamily:'inherit' }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Bouton charger plus */}
      {hasMore && (
        <button onClick={() => setPage(p => p + 1)} style={{
          width:'100%', padding:'11px 0', borderRadius:12, fontSize:13, fontWeight:700,
          background:'transparent', color:C.navy, border:`1.5px solid ${C.border}`,
          cursor:'pointer', fontFamily:'inherit', marginBottom:10,
        }}>
          ↓ Charger plus ({filtered.length - page * PAGE_SIZE} devis restants)
        </button>
      )}

      {filtered.length === 0 && (
        <div style={{ background: surface, border: `1.5px dashed ${border_}`, borderRadius: 14, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: textNav }}>Aucun devis trouvé</div>
          <div style={{ fontSize: 11, color: textSoft, marginTop: 3 }}>Modifiez votre recherche ou vos filtres</div>
        </div>
      )}

      {paginated.map(d => {
        const dejaFacture = d.factures && d.factures.length > 0
        const ouvertTexte = formatOuvert(d.ouvert_le)
        const showEmail = showEmailFor === d.id

        return (
          <div key={d.id} style={{ background: surface, border: `1px solid ${border_}`, borderRadius: 14, overflow: 'hidden', boxShadow: darkMode ? 'none' : '0 1px 4px rgba(27,45,79,0.06)' }}>

            {/* Corps */}
            <div style={{ padding: '12px 13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: 8 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: textNav }}>{d.titre}</div>
                  <div style={{ fontSize: 11, color: textSoft, marginTop: 1 }}>
                    {d.metier || 'Artisan'} - {new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {d.taux_tva && <span style={{ marginLeft: 4, color: textSoft }}>- TVA {d.taux_tva}%</span>}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                    {ouvertTexte && (
                      <span style={{ background: '#EBF4FF', color: '#2563EB', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <span style={{ width: 4, height: 4, borderRadius: 99, background: '#2563EB', display: 'inline-block' }} />
                        Ouvert {ouvertTexte}
                      </span>
                    )}
                    {dejaFacture && (
                      <span style={{ background: C.greenL, color: C.green, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>
                        🧾 {d.factures[0].numero}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.orange }}>{d.total_ttc?.toLocaleString('fr-FR')} €</div>
                  <div style={{ marginTop: 3 }}><Badge statut={d.statut} /></div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ borderTop: `1px solid ${border_}`, padding: '8px 13px', background: darkMode ? '#141F30' : C.bg, display: 'flex', flexDirection: 'column', gap: 6 }}>

              {/* Statuts + actions rapides */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                {STATUTS.map(s => (
                  <button key={s} onClick={() => changerStatut(d.id, s)} style={{
                    fontSize: 10, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                    border: 'none', fontFamily: 'inherit', fontWeight: 700,
                    background: d.statut === s ? C.navy : surface,
                    color: d.statut === s ? '#fff' : textSoft,
                    transition: 'all 0.12s',
                  }}>{s}</button>
                ))}

                {/* Dupliquer */}
                <button onClick={() => dupliquer(d)} title="Dupliquer ce devis" style={{
                  fontSize: 10, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                  border: `1px solid ${border_}`, fontFamily: 'inherit', fontWeight: 700,
                  background: surface, color: textNav,
                }}>📋 Copier</button>

                {/* Convertir en facture */}
                {d.statut === 'accepté' && !dejaFacture && (
                  <>
                    <button onClick={() => convertirEnFacture(d)} disabled={converting === d.id} style={{
                      fontSize: 10, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                      border: 'none', fontFamily: 'inherit', fontWeight: 700,
                      background: converting === d.id ? border_ : C.green, color: '#fff',
                    }}>{converting === d.id ? '⏳' : '🧾 Facturer'}</button>

                    <button onClick={() => creerAcompte(d)} disabled={acompting === d.id} style={{
                      fontSize: 10, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                      border: 'none', fontFamily: 'inherit', fontWeight: 700,
                      background: acompting === d.id ? border_ : '#2563EB', color: '#fff',
                    }}>{acompting === d.id ? '⏳' : '💳 Acompte 30%'}</button>
                  </>
                )}

                {/* Envoyer relance */}
                {d.statut === 'envoyé' && (
                  <button onClick={() => setShowEmailFor(showEmail ? null : d.id)} style={{
                    fontSize: 10, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                    border: 'none', fontFamily: 'inherit', fontWeight: 700,
                    background: C.orange, color: '#fff', marginLeft: 'auto',
                  }}>📧 Relancer</button>
                )}

                {d.statut !== 'envoyé' && (
                  <button onClick={() => supprimer(d.id)} style={{
                    fontSize: 10, padding: '3px 9px', borderRadius: 99, cursor: 'pointer',
                    border: 'none', fontFamily: 'inherit', fontWeight: 700,
                    background: C.redL, color: C.red, marginLeft: 'auto',
                  }}>🗑️</button>
                )}
              </div>

              {/* Zone email relance */}
              {showEmail && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input type="email"
                    value={emailsRelance[d.id] || ''}
                    onChange={e => setEmailsRelance(p => ({ ...p, [d.id]: e.target.value }))}
                    placeholder="email@client.fr" autoFocus
                    style={{ flex: 1, borderRadius: 9, padding: '7px 10px', fontSize: 11, background: surface, border: `1.5px solid ${border_}`, color: textNav, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button
                    onClick={async () => {
                      const email = emailsRelance[d.id]
                      if (!email) return
                      const jours = Math.floor((Date.now() - new Date(d.created_at)) / 86400000)
                      const { data: { user } } = await supabase.auth.getUser()
                      try {
                        const res = await fetch('/api/relance', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ devisId: d.id, clientEmail: email, artisanEmail: user.email, devisTitre: d.titre, devisTotal: `${d.total_ttc?.toLocaleString('fr-FR')} €`, joursAttente: jours })
                        })
                        const data = await res.json()
                        if (data.error) throw new Error(data.error)
                        setToast({ message: `✅ Relance envoyée !`, type: 'success' })
                        setShowEmailFor(null)
                      } catch(e) { setToast({ message: `❌ ${e.message}`, type: 'error' }) }
                    }}
                    style={{ padding: '7px 12px', borderRadius: 9, fontSize: 11, fontWeight: 700, background: C.orange, color: '#fff', border: 'none', cursor: 'pointer' }}>
                    → Envoyer
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
