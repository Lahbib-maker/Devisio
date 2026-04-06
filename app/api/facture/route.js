// app/api/facture/route.js
// Génère une facture à partir d'un devis accepté
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { devisId, userId } = await request.json()

    // Récupère le devis
    const { data: devis, error } = await supabase
      .from('devis')
      .select('*')
      .eq('id', devisId)
      .eq('user_id', userId)
      .single()

    if (error || !devis) {
      return Response.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    // Génère le numéro de facture
    const annee = new Date().getFullYear()
    const { count } = await supabase
      .from('factures')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const numFacture = `FAC-${annee}-${String((count || 0) + 1).padStart(3, '0')}`

    // Crée la facture
    const { data: facture, error: errFacture } = await supabase
      .from('factures')
      .insert({
        user_id: userId,
        devis_id: devisId,
        numero: numFacture,
        titre: devis.titre,
        lignes: devis.lignes,
        total_ttc: devis.total_ttc,
        taux_tva: devis.taux_tva,
        metier: devis.metier,
        statut: 'emise',
        date_emission: new Date().toISOString(),
        date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single()

    if (errFacture) throw errFacture

    // Met à jour le statut du devis
    await supabase
      .from('devis')
      .update({ statut: 'facturé' })
      .eq('id', devisId)

    return Response.json({ facture })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
