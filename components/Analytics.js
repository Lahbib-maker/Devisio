'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { C } from './ui'

function BarChart({ data, maxVal, color = C.navy }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{ fontSize: 8, color: C.textSoft, fontWeight: 600 }}>{d.val > 0 ? `${(d.val/1000).toFixed(1)}k` : ''}</div>
          <div style={{
            width: '100%', borderRadius: '3px 3px 0 0',
            background: d.isCurrentMonth ? C.orange : color,
            height: maxVal > 0 ? `${Math.max(4, (d.val / maxVal) * 64)}px` : '4px',
            transition: 'height 0.5s ease',
            opacity: d.val === 0 ? 0.2 : 1,
          }} />
          <div style={{ fontSize: 8, color: C.textSoft }}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ pct, color, label, value }) {
  const r = 30, c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke={C.border} strokeWidth="6" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color }}>{pct}%</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
      </div>
    </div>
  )
}

export default function Analytics({ user }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState(6) // mois

  const charger = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: devis }, { data: factures }] = await Promise.all([
        supabase.from('devis').select('*').eq('user_id', user.id),
        supabase.from('factures').select('*').eq('user_id', user.id),
      ])

      const d = devis || [], f = factures || []
      const now = new Date()

      // CA par mois (derniers N mois)
      const mois = []
      for (let i = periode - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = date.toLocaleDateString('fr-FR', { month: 'short' })
        const isCurrentMonth = i === 0
        const caMois = d.filter(x => {
          const c = new Date(x.created_at)
          return c.getFullYear() === date.getFullYear() && c.getMonth() === date.getMonth() && x.statut === 'accepté'
        }).reduce((s, x) => s + (x.total_ttc || 0), 0)
        mois.push({ label, val: caMois, isCurrentMonth })
      }

      // Stats globales
      const total        = d.length
      const acceptes     = d.filter(x => x.statut === 'accepté').length
      const envoyes      = d.filter(x => x.statut === 'envoyé').length
      const taux         = total ? Math.round(acceptes / total * 100) : 0
      const caTotal      = d.filter(x => x.statut === 'accepté').reduce((s, x) => s + (x.total_ttc || 0), 0)
      const caFacture    = f.filter(x => x.statut === 'payee').reduce((s, x) => s + (x.total_ttc || 0), 0)
      const caAttente    = f.filter(x => x.statut === 'emise').reduce((s, x) => s + (x.total_ttc || 0), 0)
      const nbOuverts    = d.filter(x => x.ouvert_le).length
      const txOuverture  = envoyes ? Math.round(nbOuverts / (envoyes + nbOuverts) * 100) : 0

      // Top métiers
      const byMetier = {}
      d.filter(x => x.statut === 'accepté').forEach(x => {
        byMetier[x.metier || 'Autre'] = (byMetier[x.metier || 'Autre'] || 0) + (x.total_ttc || 0)
      })
      const topMetiers = Object.entries(byMetier).sort((a, b) => b[1] - a[1]).slice(0, 4)

      // Temps moyen de réponse
      const devisOuverts = d.filter(x => x.ouvert_le && x.statut === 'accepté')
      const tempsReponseMoyen = devisOuverts.length
        ? Math.round(devisOuverts.reduce((s, x) => s + (new Date(x.ouvert_le) - new Date(x.created_at)) / 86400000, 0) / devisOuverts.length)
        : null

      // CA mois en cours
      const maintenant = new Date()
      const debutMoisActuel = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1)
      const caMoisEnCours = d
        .filter(x => x.statut === 'accepté' && new Date(x.created_at) >= debutMoisActuel)
        .reduce((s, x) => s + (x.total_ttc || 0), 0)
      const nbDevisMoisEnCours = d
        .filter(x => new Date(x.created_at) >= debutMoisActuel).length

      setData({ mois, total, acceptes, envoyes, taux, caTotal, caFacture, caAttente, nbOuverts, txOuverture, topMetiers, tempsReponseMoyen, caMoisEnCours, nbDevisMoisEnCours })
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [user, periode])

    if (!user?.id) return
  useEffect(() => { charger() }, [charger])

    if (!user) return null

  if (loading) return <div style={{ textAlign: 'center', padding: '48px 0', color: C.textSoft, fontSize: 14 }}>Chargement des statistiques...</div>
  if (!data) return null

  const maxCA = Math.max(...data.mois.map(m => m.val), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Période */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[3, 6, 12].map(p => (
          <button key={p} onClick={() => setPeriode(p)} style={{
            padding: '6px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            background: periode === p ? C.navy : C.surface,
            color: periode === p ? '#fff' : C.textSoft,
            border: `1px solid ${periode === p ? C.navy : C.border}`,
          }}>{p} mois</button>
        ))}
      </div>

      {/* CA par mois */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16, boxShadow: '0 1px 4px rgba(27,45,79,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.navy }}>CA mensuel (devis acceptés)</div>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textSoft }}>MOIS EN COURS</div>
            <div style={{ fontSize:20, fontWeight:800, color:C.orange }}>{(data.caMoisEnCours||0).toLocaleString('fr-FR')} €</div>
            <div style={{ fontSize:10, color:C.textSoft }}>{data.nbDevisMoisEnCours||0} devis ce mois</div>
          </div>
          <div style={{ width:1, background:C.border, alignSelf:'stretch' }}/>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            <div style={{ fontSize:11, fontWeight:700, color:C.textSoft }}>TOTAL ACCEPTÉ</div>
            <div style={{ fontSize:16, fontWeight:800, color:C.navy }}>{data.caTotal.toLocaleString('fr-FR')} €</div>
          </div>
        </div>
        <BarChart data={data.mois} maxVal={maxCA} color={C.navy} />
        <div style={{ fontSize: 10, color: C.textSoft, marginTop: 6, textAlign: 'right' }}>
          🟠 = mois en cours
        </div>
      </div>

      {/* KPIs principaux */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
          <DonutChart pct={data.taux} color={C.green} label="Taux d'acceptation" value={`${data.acceptes}/${data.total}`} />
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
          <DonutChart pct={data.txOuverture} color='#2563EB' label="Taux ouverture" value={`${data.nbOuverts} ouverts`} />
        </div>
      </div>

      {/* Factures */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginBottom: 12 }}>Trésorerie factures</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Encaissé', val: data.caFacture, color: C.green, pct: data.caTotal ? Math.round(data.caFacture / data.caTotal * 100) : 0 },
            { label: 'En attente', val: data.caAttente, color: '#2563EB', pct: data.caTotal ? Math.round(data.caAttente / data.caTotal * 100) : 0 },
          ].map(s => (
            <div key={s.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: C.textMid }}>{s.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.val.toLocaleString('fr-FR')} €</span>
              </div>
              <div style={{ height: 6, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 99, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top métiers */}
      {data.topMetiers.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.navy, marginBottom: 12 }}>Top métiers (CA accepté)</div>
          {data.topMetiers.map(([metier, ca], i) => {
            const maxMetier = data.topMetiers[0][1]
            return (
              <div key={metier} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: C.textMid }}>{metier}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.navy }}>{ca.toLocaleString('fr-FR')} €</span>
                </div>
                <div style={{ height: 6, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.round(ca / maxMetier * 100)}%`, background: [C.orange, C.navy, C.green, '#2563EB'][i], borderRadius: 99, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Infos rapides */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '📋', label: 'Devis total',        val: data.total },
          { icon: '✅', label: 'Devis acceptés',      val: data.acceptes },
          { icon: '📧', label: 'En cours (envoyés)',  val: data.envoyes },
          { icon: '⏱️', label: 'Délai moyen réponse', val: data.tempsReponseMoyen !== null ? `${data.tempsReponseMoyen}j` : '—' },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 13px', boxShadow: '0 1px 3px rgba(27,45,79,0.05)' }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.navy, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: C.textSoft, marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

    </div>
  )
}
