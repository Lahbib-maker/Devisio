// app/api/export/route.js
// Exporte devis et factures en CSV pour le comptable
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function toCSV(rows, headers) {
  const escape = v => `"${String(v || '').replace(/"/g, '""')}"`
  const head = headers.map(h => escape(h.label)).join(';')
  const body = rows.map(r => headers.map(h => escape(r[h.key])).join(';')).join('\n')
  return '\uFEFF' + head + '\n' + body // BOM for Excel
}

export async function GET(request) {
  try {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const type   = searchParams.get('type') || 'devis' // devis | factures | all
  const mois   = searchParams.get('mois') // YYYY-MM optionnel

  if (!userId) return new Response('userId requis', { status: 400 })

  let csv = ''
  const filename = `devios-export-${type}-${new Date().toISOString().slice(0,10)}.csv`

  if (type === 'factures') {
    let query = supabase.from('factures').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (mois) { query = query.gte('created_at', `${mois}-01`).lte('created_at', `${mois}-31`) }
    const { data } = await query

    csv = toCSV(data || [], [
      { key: 'numero',        label: 'N° Facture' },
      { key: 'titre',         label: 'Désignation' },
      { key: 'metier',        label: 'Métier' },
      { key: 'statut',        label: 'Statut' },
      { key: 'total_ttc',     label: 'Montant TTC (€)' },
      { key: 'taux_tva',      label: 'TVA (%)' },
      { key: 'date_emission', label: "Date d'émission" },
      { key: 'date_echeance', label: "Date d'échéance" },
    ])
  } else {
    let query = supabase.from('devis').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (mois) { query = query.gte('created_at', `${mois}-01`).lte('created_at', `${mois}-31`) }
    const { data } = await query

    const rows = (data || []).map(d => ({
      ...d,
      created_at: new Date(d.created_at).toLocaleDateString('fr-FR'),
      ouvert_le: d.ouvert_le ? new Date(d.ouvert_le).toLocaleDateString('fr-FR') : '',
    }))

    csv = toCSV(rows, [
      { key: 'titre',      label: 'Titre du devis' },
      { key: 'metier',     label: 'Métier' },
      { key: 'statut',     label: 'Statut' },
      { key: 'total_ttc',  label: 'Montant TTC (€)' },
      { key: 'taux_tva',   label: 'TVA (%)' },
      { key: 'created_at', label: 'Date création' },
      { key: 'ouvert_le',  label: 'Ouvert le' },
    ])
  }

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    }
  })
  } catch(e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
