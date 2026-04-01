import { createClient } from '@supabase/supabase-js'
import { demoWorkspace } from '../data/demoWorkspace'

const STORAGE_KEY = 'pitboard-demo-workspace-v2'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

export const cloudEnabled = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = cloudEnabled
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null

function clone(data) {
  return JSON.parse(JSON.stringify(data))
}

export async function getSession() {
  if (!supabase) return null
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

export function subscribeToAuth(callback) {
  if (!supabase) return { unsubscribe() {} }
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return subscription
}

export async function requestMagicLink(email) {
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured yet. Use demo mode for now.' }
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin,
    },
  })

  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function signInWithPassword(email, password) {
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' }
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function signUpWithPassword(email, password) {
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' }
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function signInWithGoogle() {
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function getHasShopAdmin() {
  if (!supabase) return false
  const { data, error } = await supabase.rpc('has_shop_admin')
  if (error) return false
  return Boolean(data)
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function loadWorkspace(userId) {
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('builds')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })

    if (!error && data?.length) {
      const firstRow = data[0]
      return {
        shop: {
          ...demoWorkspace.shop,
          ...(firstRow.data?.shopSnapshot || {}),
          promise: 'Cloud-synced customer access is enabled.',
        },
        builds: data.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          vehicleType: row.data?.vehicleType ?? 'Truck',
          vehicleYear: row.data?.vehicleYear ?? '',
          vehicleMake: row.data?.vehicleMake ?? '',
          vehicleModel: row.data?.vehicleModel ?? '',
          vehicle: row.vehicle,
          status: row.status,
          brief: row.brief,
          nextMilestone: row.next_milestone,
          portalSummary: row.portal_summary,
          updatedAt: row.updated_at,
          budget: { target: row.budget_target },
          client: row.client,
          phases: row.data?.phases?.map((phase) => ({ blockedOn: '', ...phase })) ?? [],
          parts: row.data?.parts?.map((part) => ({
            vendor: '',
            supplier: '',
            source: 'Aftermarket',
            photos: [],
            ...part,
          })) ?? [],
          pins: row.data?.pins?.map((pin) => ({ wireGauge: '', wireColor: '', ...pin })) ?? [],
          tunes: row.data?.tunes?.map((tune) => ({
            ecuPlatform: 'Other',
            tuneType: 'Other',
            dataLog: null,
            ...tune,
          })) ?? [],
          labor: row.data?.labor ?? [],
          shopSnapshot: row.data?.shopSnapshot ?? { ...demoWorkspace.shop },
          technicianNotes: row.data?.technicianNotes ?? {
            dashboard: [],
            parts: [],
            wiring: [],
            tunes: [],
            journal: [],
          },
          journal: row.data?.journal?.map((entry) => ({ photos: [], ...entry })) ?? [],
        })),
      }
    }
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const initial = clone(demoWorkspace)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }

  try {
    return JSON.parse(raw)
  } catch {
    const initial = clone(demoWorkspace)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
    return initial
  }
}

export function saveWorkspaceLocal(workspace) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
}

export async function getProfile(userId) {
  if (!supabase || !userId) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) return null
  return data
}

export async function listProfiles() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return []
  return data
}

export async function upsertProfile(profile) {
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: 'No active session.' }
  if (profile.id && profile.id !== user.id) return { ok: false, message: 'Cannot modify another user\'s profile.' }
  const { error } = await supabase.from('profiles').upsert({
    ...profile,
    id: user.id,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

export async function updateProfileByAdmin(profile) {
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' }
  const { error } = await supabase
    .from('profiles')
    .update({
      email: profile.email,
      role: profile.role,
      is_admin: profile.is_admin,
      full_name: profile.full_name,
      shop_name: profile.shop_name,
      // Admins can override tier (for comps, trials, etc.)
      ...(profile.tier !== undefined ? { tier: profile.tier } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', profile.id)

  if (error) return { ok: false, message: error.message }
  return { ok: true }
}

// Calls the create-checkout-session edge function and redirects to Stripe Checkout
export async function createCheckoutSession(tier) {
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, message: 'Not signed in.' }

  const res = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ tier }),
  })

  const json = await res.json()
  if (!res.ok || !json.url) return { ok: false, message: json.error || 'Failed to start checkout.' }

  // Redirect to Stripe Checkout — control returns via success_url / cancel_url
  window.location.href = json.url
  return { ok: true }
}

// Opens the Stripe Customer Portal so users can manage / cancel their subscription
export async function openBillingPortal() {
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' }

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, message: 'Not signed in.' }

  const res = await fetch(`${supabaseUrl}/functions/v1/billing-portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ return_url: window.location.origin }),
  })

  const json = await res.json()
  if (!res.ok || !json.url) return { ok: false, message: json.error || 'Could not open billing portal.' }

  window.location.href = json.url
  return { ok: true }
}

export async function deleteBuildFromCloud(buildId, userId) {
  if (!supabase || !userId || !buildId) return
  await supabase.from('builds').delete().eq('id', buildId).eq('owner_id', userId)
}

export async function saveBuild(build, userId) {
  if (!supabase || !userId) return

  await supabase.from('builds').upsert({
    id: build.id,
    owner_id: userId,
    slug: build.slug,
    name: build.name,
    vehicle: build.vehicle,
    status: build.status,
    brief: build.brief,
    next_milestone: build.nextMilestone,
    portal_summary: build.portalSummary,
    budget_target: build.budget.target,
    client: build.client,
    updated_at: new Date().toISOString(),
    data: {
      vehicleType: build.vehicleType || 'Truck',
      vehicleYear: build.vehicleYear || '',
      vehicleMake: build.vehicleMake || '',
      vehicleModel: build.vehicleModel || '',
      phases: build.phases,
      parts: build.parts,
      pins: build.pins,
      tunes: build.tunes,
      labor: build.labor || [],
      shopSnapshot: build.shopSnapshot || { ...demoWorkspace.shop },
      technicianNotes: build.technicianNotes || {
        dashboard: [],
        parts: [],
        wiring: [],
        tunes: [],
        journal: [],
      },
      journal: build.journal,
    },
  })
}
