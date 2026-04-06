// app/api/acompte/route.js
// Génère une facture d'acompte (30%) depuis un devis accepté
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { devisId, userId, pourcentage = 30 } = await request.json()

    const { data: devis, error } = await supabase
      .from('devis').select('*').eq('id', devisId).eq('user_id', userId).single()
    if (error || !devis) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

    const { count } = await supabase
      .from('factures').select('*', { count: 'exact', head: true }).eq('user_id', userId)

    const annee = new Date().getFullYear()
    const numAcompte = `FAC-${annee}-${String((count || 0) + 1).padStart(3, '0')}-AC`
    const montantAcompte = Math.round(devis.total_ttc * (pourcentage / 100) * 100) / 100
    const montantSolde   = Math.round((devis.total_ttc - montantAcompte) * 100) / 100

    // Facture acompte
    const { data: acompte } = await supabase.from('factures').insert({
      user_id: userId, devis_id: devisId,
      numero: numAcompte,
      titre: `Acompte ${pourcentage}% — ${devis.titre}`,
      lignes: [{ description: `Acompte de ${pourcentage}% sur devis ${devis.titre}`, quantite: 1, unite: 'forfait', prixUnitaire: montantAcompte }],
      total_ttc: montantAcompte, taux_tva: devis.taux_tva, metier: devis.metier,
      statut: 'emise', type: 'acompte',
      date_emission: new Date().toISOString(),
      date_echeance: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()

    // Facture solde (créée mais pas encore émise)
    const numSolde = `FAC-${annee}-${String((count || 0) + 2).padStart(3, '0')}-SO`
    const { data: solde } = await supabase.from('factures').insert({
      user_id: userId, devis_id: devisId,
      numero: numSolde,
      titre: `Solde ${100 - pourcentage}% — ${devis.titre}`,
      lignes: [{ description: `Solde à réception des travaux — ${devis.titre}`, quantite: 1, unite: 'forfait', prixUnitaire: montantSolde }],
      total_ttc: montantSolde, taux_tva: devis.taux_tva, metier: devis.metier,
      statut: 'brouillon', type: 'solde',
      date_emission: new Date().toISOString(),
      date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()

    return Response.json({ acompte, solde, montantAcompte, montantSolde })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
