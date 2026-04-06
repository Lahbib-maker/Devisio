// app/api/track-open/route.js
// Pixel de tracking 1x1 inséré dans l'email — déclenché quand le client ouvre le mail
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const devisId = searchParams.get('id')

  if (devisId) {
    try {
      await supabase
        .from('devis')
        .update({
          ouvert_le: new Date().toISOString(),
          nb_ouvertures: supabase.rpc('increment', { row_id: devisId })
        })
        .eq('id', devisId)
        .is('ouvert_le', null) // Ne compte que la première ouverture
    } catch {}
  }

  // Retourne un pixel transparent 1x1
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )

  return new Response(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
    }
  })
}
