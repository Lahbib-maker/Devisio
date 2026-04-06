// app/api/devis-public/route.js
// Récupère un devis public via service_role (bypass RLS)
// Utilisé par la page /devis/[id] accessible sans connexion
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) return Response.json({ error: 'id manquant' }, { status: 400 })

  try {
    // Récupérer le devis
    const { data: devis, error } = await supabase
      .from('devis')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !devis) {
      return Response.json({ error: 'Devis introuvable' }, { status: 404 })
    }

    // Récupérer le profil artisan
    const { data: profil } = await supabase
      .from('profils')
      .select('raison_sociale, forme_juridique, siret, adresse, tel, email, tva_intra, assurance_nom, assurance_police, assurance_zone')
      .eq('user_id', devis.user_id)
      .single()

    // Tracker l'ouverture (seulement la première)
    if (!devis.ouvert_le) {
      await supabase
        .from('devis')
        .update({
          ouvert_le: new Date().toISOString(),
          nb_ouvertures: 1
        })
        .eq('id', id)
    } else {
      await supabase
        .from('devis')
        .update({ nb_ouvertures: (devis.nb_ouvertures || 0) + 1 })
        .eq('id', id)
    }

    // Ne jamais exposer user_id ou données sensibles
    const { user_id, ...devisSafe } = devis

    return Response.json({ devis: devisSafe, profil: profil || null })

  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
