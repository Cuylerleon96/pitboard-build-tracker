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

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function loadWorkspace(userId) {
  if (supabase && userId) {
    const { data, error } = await supabase
      .from('builds')
      .select('*')
      .order('updated_at', { ascending: false })

    if (!error && data?.length) {
      return {
        shop: { ...demoWorkspace.shop, promise: 'Cloud-synced customer access is enabled.' },
        builds: data.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
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
          phases: row.data?.phases ?? [],
          parts: row.data?.parts ?? [],
          pins: row.data?.pins ?? [],
          tunes: row.data?.tunes ?? [],
          technicianNotes: row.data?.technicianNotes ?? {
            dashboard: [],
            parts: [],
            wiring: [],
            tunes: [],
            journal: [],
          },
          journal: row.data?.journal ?? [],
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

export async function upsertProfile(profile) {
  if (!supabase) return { ok: false, message: 'Supabase is not configured yet.' }
  const { error } = await supabase.from('profiles').upsert({
    ...profile,
    updated_at: new Date().toISOString(),
  })
  if (error) return { ok: false, message: error.message }
  return { ok: true }
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
      vehicleYear: build.vehicleYear || '',
      vehicleMake: build.vehicleMake || '',
      vehicleModel: build.vehicleModel || '',
      phases: build.phases,
      parts: build.parts,
      pins: build.pins,
      tunes: build.tunes,
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
