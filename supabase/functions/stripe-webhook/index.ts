import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Map Stripe Price IDs back to tier names
// Set STRIPE_PRICE_GARAGE and STRIPE_PRICE_SHOP in Supabase secrets
function tierFromPriceId(priceId: string): string | null {
  const map: Record<string, string> = {
    [Deno.env.get('STRIPE_PRICE_GARAGE')!]: 'garage',
    [Deno.env.get('STRIPE_PRICE_SHOP')!]: 'shop',
  }
  return map[priceId] ?? null
}

async function setUserTier(supabaseUserId: string, tier: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ tier, updated_at: new Date().toISOString() })
    .eq('id', supabaseUserId)

  if (error) {
    console.error(`Failed to set tier for ${supabaseUserId}:`, error)
    throw error
  }
  console.log(`Set tier=${tier} for user ${supabaseUserId}`)
}

async function getUserIdFromCustomer(customerId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return data?.id ?? null
}

Deno.serve(async (req) => {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')!,
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message)
    return new Response(`Webhook Error: ${err.message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession
        const userId = session.metadata?.supabase_user_id
        const tier = session.metadata?.tier
        if (userId && tier) {
          await setUserTier(userId, tier)
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const userId = await getUserIdFromCustomer(customerId)
        if (!userId) break

        // Determine the active tier from the first subscription item's price
        const priceId = sub.items.data[0]?.price?.id
        const tier = tierFromPriceId(priceId)

        if (sub.status === 'active' && tier) {
          await setUserTier(userId, tier)
        } else if (['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
          // Downgrade to free if the subscription lapses
          await setUserTier(userId, 'free')
        }
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string
        const userId = await getUserIdFromCustomer(customerId)
        if (userId) {
          await setUserTier(userId, 'free')
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    console.error(`Error processing ${event.type}:`, err)
    return new Response(`Handler error: ${err.message}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
