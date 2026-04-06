// app/api/signer/route.js
// Signature électronique d'un devis par le client
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { devisId, signatureData, nomSignataire } = await request.json()
    if (!devisId || !signatureData) {
      return Response.json({ error: 'Données manquantes' }, { status: 400 })
    }
    const ip = request.headers.get('x-forwarded-for') || 'unknown'

    const { error: sigError } = await supabase.from('signatures').insert({
      devis_id: devisId, signature_data: signatureData,
      ip_client: ip, nom_signataire: nomSignataire || '',
      signe_le: new Date().toISOString(),
    })
    if (sigError) throw sigError

    await supabase.from('devis').update({ statut: 'accepté' }).eq('id', devisId)

    // Notifier l'artisan
    const { data: devis } = await supabase
      .from('devis').select('titre, total_ttc, user_id, lignes, taux_tva, metier').eq('id', devisId).single()
    if (devis && process.env.RESEND_API_KEY) {
      const { data: profil } = await supabase
        .from('profils').select('email').eq('user_id', devis.user_id).single()
      if (profil?.email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'Devios <noreply@devios.fr>',
            to: [profil.email],
            subject: `🎉 Devis signé — ${devis.titre}`,
            html: `<div style="font-family:sans-serif;padding:24px;max-width:480px"><h2 style="color:#2D7D46">🎉 Devis accepté !</h2><p style="color:#4A5568"><strong>${nomSignataire||'Votre client'}</strong> a signé <strong>${devis.titre}</strong> — <strong>${devis.total_ttc?.toLocaleString('fr-FR')} € TTC</strong>.<br>Signé le ${new Date().toLocaleDateString('fr-FR')}</p><a href="${process.env.NEXT_PUBLIC_APP_URL||'https://devios.fr'}" style="background:#E8650A;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700;display:inline-block;margin-top:12px">Voir le devis →</a></div>`
          })
        }).catch(() => {})
      }
    }
    // Créer automatiquement la facture d'acompte 30%
    if (devis) {
      const acompte = Math.round((devis.total_ttc || 0) * 0.3 * 100) / 100
      const annee = new Date().getFullYear()
      const { count } = await supabase
        .from('factures').select('*', { count: 'exact', head: true })
        .eq('user_id', devis.user_id)
      const num = `FAC-${annee}-${String((count || 0) + 1).padStart(3, '0')}`
      await supabase.from('factures').insert({
        user_id: devis.user_id,
        devis_id: devisId,
        numero: num,
        titre: `Acompte 30% — ${devis.titre}`,
        lignes: devis.lignes,
        total_ttc: acompte,
        taux_tva: devis.taux_tva || 10,
        metier: devis.metier,
        statut: 'emise',
        type: 'acompte',
      }).catch(() => {}) // Non bloquant
    }

    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const devisId = searchParams.get('devisId')
  if (!devisId) return Response.json({ signed: false })
  const { data } = await supabase.from('signatures').select('*').eq('devis_id', devisId).single()
  return Response.json({ signed: !!data, signature: data || null })
}
