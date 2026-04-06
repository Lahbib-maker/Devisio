// app/api/push/route.js
// Gestion des notifications push PWA
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST /api/push — enregistre un abonnement push
export async function POST(request) {
  try {
    const { subscription, userId } = await request.json()
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      subscription: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

// Fonction utilitaire — appelée depuis track-open pour notifier l'artisan
export async function notifyArtisan(userId, title, body) {
  try {
    const { data } = await supabase
      .from('push_subscriptions').select('subscription').eq('user_id', userId).single()
    if (!data) return

    // En production: utiliser web-push library avec VAPID keys
    // npm install web-push
    // const webpush = require('web-push')
    // webpush.setVapidDetails('mailto:contact@devios.fr', VAPID_PUBLIC, VAPID_PRIVATE)
    // await webpush.sendNotification(JSON.parse(data.subscription), JSON.stringify({ title, body }))
    console.log(`Push notification pour ${userId}: ${title} — ${body}`)
  } catch (e) {
    console.error('Push notification error:', e)
  }
}
