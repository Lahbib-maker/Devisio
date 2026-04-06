// Crée une session Stripe Checkout pour démarrer un abonnement
import { stripe, PLANS } from '../../../../lib/stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { planId, userId, userEmail } = await request.json()

    const plan = PLANS[planId]
    if (!plan || !plan.priceId) {
      return Response.json({ error: 'Plan invalide' }, { status: 400 })
    }

    // Récupère ou crée le customer Stripe
    let customerId = null
    const { data: profile } = await supabaseAdmin
      .from('profils')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (profile?.stripe_customer_id) {
      customerId = profile.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { user_id: userId },
      })
      customerId = customer.id
      await supabaseAdmin
        .from('profils')
        .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: 'user_id' })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: userId, plan: planId },
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/?success=true&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      locale: 'fr',
      allow_promotion_codes: true,
    })

    return Response.json({ url: session.url })
  } catch (e) {
    console.error(e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
