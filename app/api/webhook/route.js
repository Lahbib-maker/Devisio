// Webhook Stripe — met à jour le plan dans Supabase à chaque événement
import { stripe } from '../../../lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (e) {
    return new Response(`Webhook Error: ${e.message}`, { status: 400 })
  }

  const updatePlan = async (subscription, status) => {
    const userId = subscription.metadata?.user_id
    if (!userId) return
    const planId = subscription.metadata?.plan || 'gratuit'
    await supabaseAdmin
      .from('profils')
      .update({
        plan: status === 'active' || status === 'trialing' ? planId : 'gratuit',
        stripe_subscription_id: subscription.id,
        subscription_status: status,
      })
      .eq('user_id', userId)
  }

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await updatePlan(event.data.object, event.data.object.status)
      break
    case 'customer.subscription.deleted':
      await updatePlan(event.data.object, 'canceled')
      break
    case 'invoice.payment_failed':
      const sub = await stripe.subscriptions.retrieve(event.data.object.subscription)
      await updatePlan(sub, 'past_due')
      break
  }

  return Response.json({ received: true })
}
