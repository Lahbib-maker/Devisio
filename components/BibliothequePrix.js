'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C } from './ui'

export default function BibliothequePrix({ user, onSelect, metier }) {
  const [items, setItems]     = useState([])
  const [open, setOpen]       = useState(false)
  const [form, setForm]       = useState({ description: '', unite: 'forfait', prix: '' })
  const [search, setSearch]   = useState('')
  const [saving, setSaving]   = useState(false)

  const UNITES = ['forfait', 'heure', 'jour', 'm²', 'm³', 'ml', 'u', 'kg', 'lot']

  const charger = useCallback(async () => {
    const { data } = await supabase
      .from('bibliotheque_prix')
      .select('*')
      .eq('user_id', user.id)
      .order('usage_count', { ascending: false })
    setItems(data || [])
  }, [user])

    if (!user?.id) return
  useEffect(() => { if (open) charger() }, [open, charger])

  const sauvegarder = async () => {
    if (!form.description || !form.prix) return
    setSaving(true)
    try {
      await supabase.from('bibliotheque_prix').insert({
        user_id: user.id,
        description: form.description,
        unite: form.unite,
        prix: parseFloat(form.prix),
        metier: metier || 'Général',
        usage_count: 0,
      })
      setForm({ description: '', unite: 'forfait', prix: '' })
      charger()
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const selectionner = async (item) => {
    // Incrémente le compteur d'usage
    await supabase.from('bibliotheque_prix').update({ usage_count: (item.usage_count || 0) + 1 }).eq('id', item.id)
    onSelect({ description: item.description, unite: item.unite, prixUnitaire: item.prix, quantite: 1 })
    setOpen(false)
  }

  const supprimer = async (id) => {
    await supabase.from('bibliotheque_prix').delete().eq('id', id)
    charger()
  }

  const filtered = items.filter(i =>
    !search || i.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Bouton déclencheur */}
      <button onClick={() => setOpen(true)} style={{
        width: '100%', padding: '9px', borderRadius: 10, fontSize: 12, fontWeight: 700,
        background: C.surfaceAlt, color: C.navy, border: `1.5px solid ${C.border}`,
        cursor: 'pointer', fontFamily: 'inherit', marginBottom: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      }}>
        📚 Mes tarifs habituels
      </button>

      {/* Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(27,45,79,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 16px 16px',
        }} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div style={{ background: C.surface, borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 40px rgba(27,45,79,0.15)' }}>

            {/* Header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.navy }}>📚 Mes tarifs habituels</div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.textSoft }}>✕</button>
            </div>

            {/* Ajouter */}
            <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.textSoft, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ajouter une prestation</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Description de la prestation"
                  style={{ borderRadius: 10, padding: '8px 10px', fontSize: 12, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.text, outline: 'none', fontFamily: 'inherit' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={form.unite} onChange={e => setForm(f => ({ ...f, unite: e.target.value }))}
                    style={{ flex: 1, borderRadius: 10, padding: '8px 8px', fontSize: 12, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.text, outline: 'none', fontFamily: 'inherit' }}>
                    {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input type="number" value={form.prix} onChange={e => setForm(f => ({ ...f, prix: e.target.value }))}
                    placeholder="Prix HT (€)"
                    style={{ flex: 1, borderRadius: 10, padding: '8px 10px', fontSize: 12, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.text, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button onClick={sauvegarder} disabled={saving || !form.description || !form.prix} style={{
                    padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    background: form.description && form.prix ? C.navy : C.border,
                    color: form.description && form.prix ? '#fff' : C.textSoft,
                    border: 'none', cursor: 'pointer',
                  }}>+</button>
                </div>
              </div>
            </div>

            {/* Recherche */}
            <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="🔍 Rechercher..."
                style={{ width: '100%', borderRadius: 10, padding: '7px 10px', fontSize: 12, background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.text, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>

            {/* Liste */}
            <div style={{ overflowY: 'auto', padding: '8px 16px 16px', flex: 1 }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: C.textSoft, fontSize: 13 }}>
                  {items.length === 0 ? 'Aucune prestation enregistrée' : 'Aucun résultat'}
                </div>
              ) : filtered.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{item.description}</div>
                    <div style={{ fontSize: 10, color: C.textSoft, marginTop: 1 }}>
                      {item.prix.toLocaleString('fr-FR')} € / {item.unite}
                      {item.usage_count > 0 && <span style={{ marginLeft: 6, color: C.orange }}>- utilisé {item.usage_count}×</span>}
                    </div>
                  </div>
                  <button onClick={() => selectionner(item)} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, background: C.navy, color: '#fff', border: 'none', cursor: 'pointer' }}>
                    + Ajouter
                  </button>
                  <button onClick={() => supprimer(item.id)} style={{ padding: '5px 8px', borderRadius: 8, fontSize: 11, background: C.redL, color: C.red, border: 'none', cursor: 'pointer' }}>
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
