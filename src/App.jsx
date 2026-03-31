import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import './App.css'
import { demoWorkspace } from './data/demoWorkspace'
import {
  cloudEnabled,
  getProfile,
  getSession,
  loadWorkspace,
  saveBuild,
  saveWorkspaceLocal,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  subscribeToAuth,
  upsertProfile,
} from './lib/dataClient'

const partsStatuses = ['planned', 'quoted', 'ordered', 'received', 'installed', 'blocked']
const tabs = ['dashboard', 'builds', 'parts', 'wiring', 'tunes', 'journal', 'settings']
const customerTabs = ['dashboard', 'parts', 'wiring', 'tunes', 'journal', 'settings']
const roles = ['shop', 'customer']
const years = Array.from({ length: 48 }, (_, index) => String(new Date().getFullYear() + 1 - index))
const makes = ['Nissan', 'Ford', 'Chevrolet', 'Toyota', 'Honda', 'Dodge', 'Jeep', 'BMW', 'Mercedes-Benz', 'Other']
const modelsByMake = {
  Nissan: ['D21 Pickup', '240SX', '300ZX', '350Z', '370Z', 'Frontier', 'Pathfinder', 'Other'],
  Ford: ['Mustang', 'F-150', 'Ranger', 'Focus', 'Bronco', 'Other'],
  Chevrolet: ['C10', 'Silverado', 'Camaro', 'Corvette', 'S10', 'Other'],
  Toyota: ['Tacoma', 'Hilux', 'Supra', '4Runner', 'Corolla', 'Other'],
  Honda: ['Civic', 'Accord', 'S2000', 'CR-V', 'Other'],
  Dodge: ['Ram', 'Charger', 'Challenger', 'Dakota', 'Other'],
  Jeep: ['Cherokee', 'Grand Cherokee', 'Wrangler', 'Comanche', 'Other'],
  BMW: ['E30', 'E36', 'E46', 'E90', 'Other'],
  'Mercedes-Benz': ['190E', 'C-Class', 'E-Class', 'SL', 'Other'],
  Other: ['Custom', 'Other'],
}
const partCategories = ['Engine', 'Fuel System', 'Turbo System', 'Cooling', 'ECU / Wiring', 'Sensors', 'Suspension', 'Brakes', 'Body', 'Interior', 'Exhaust', 'General']
const pinTypes = ['Analog 0-5V', 'Analog NTC', 'Digital input', 'Digital output', 'Ground', '5V reference', 'PWM output', 'Injector output', 'Ignition output', 'Other']
const tuneStatuses = ['Testing', 'Approved', 'Archived']
const buildStatuses = ['Planning', 'In Progress', 'Waiting', 'Delivered']
const portalStatuses = ['Not invited', 'Invite pending', 'Portal active', 'Portal paused']

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function cloneWorkspace(data) {
  return JSON.parse(JSON.stringify(data))
}

function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function formatDate(value) {
  if (!value) return 'No date'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDateTime(value) {
  if (!value) return 'No activity yet'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function totalPartsCost(parts) {
  return parts.reduce((sum, part) => sum + Number(part.unitCost || 0) * Number(part.qty || 0), 0)
}

function getMetrics(build) {
  const installed = build.parts.filter((part) => part.status === 'installed').length
  const ordered = build.parts.filter((part) => ['quoted', 'ordered', 'received'].includes(part.status)).length
  const verified = build.pins.filter((pin) => pin.verified).length
  const totalPhases = build.phases.length || 1
  const complete = build.phases.filter((phase) => phase.done).length

  return {
    installed,
    ordered,
    verified,
    spend: totalPartsCost(build.parts),
    completion: Math.round((complete / totalPhases) * 100),
  }
}

function statusClass(status) {
  if (['installed', 'active', 'approved'].includes(String(status).toLowerCase())) return 'good'
  if (['blocked', 'on hold'].includes(String(status).toLowerCase())) return 'bad'
  if (['quoted', 'ordered', 'received', 'testing'].includes(String(status).toLowerCase())) return 'warn'
  return 'neutral'
}

function getVehicleLabel(build) {
  if (build.vehicleYear || build.vehicleMake || build.vehicleModel) {
    return [build.vehicleYear, build.vehicleMake, build.vehicleModel].filter(Boolean).join(' ') || 'Year Make Model'
  }
  return build.vehicle || 'Year Make Model'
}

function getModelOptions(make) {
  return modelsByMake[make] || modelsByMake.Other
}

function getEmptyTechnicianNotes() {
  return { dashboard: [], parts: [], wiring: [], tunes: [], journal: [] }
}

const emptyBuild = {
  id: 'empty-build',
  slug: 'empty-build',
  name: 'No build selected',
  vehicleYear: '',
  vehicleMake: '',
  vehicleModel: '',
  vehicle: '',
  status: 'Planning',
  brief: '',
  nextMilestone: '',
  portalSummary: '',
  updatedAt: '',
  budget: { target: 0 },
  client: { name: '', email: '', portalStatus: 'Not invited' },
  phases: [],
  parts: [],
  pins: [],
  tunes: [],
  technicianNotes: getEmptyTechnicianNotes(),
  journal: [],
}

function extractTuneValue(text, key) {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*([^\\r\\n]+)`, 'm'))
  return match ? match[1].trim() : ''
}

function summarizeTuneImport(fileName, text) {
  const importantKeys = ['nCylinders', 'engineType', 'reqFuel', 'fuelAlgorithm', 'sparkMode', 'egoAlgorithm']
  const detected = importantKeys
    .map((key) => [key, extractTuneValue(text, key)])
    .filter(([, value]) => value)

  const versionMatch = fileName.match(/v\d+(?:\.\d+)+|v\d+/i)

  return {
    version: versionMatch?.[0] || '',
    name: fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '),
    summary: detected.map(([key, value]) => `${key}: ${value}`).join(' | '),
  }
}

function TechnicianNotes({ entries, draft, onChange, onSubmit, onDelete, title }) {
  return (
    <article className="card">
      <div className="card-title">{title}</div>
      <form className="stack-form" onSubmit={onSubmit}>
        <textarea onChange={(event) => onChange(event.target.value)} placeholder="Internal note for technicians only" rows="3" value={draft} />
        <button className="button primary" type="submit">Add technician note</button>
      </form>
      <div className="journal-list">
        {entries.length === 0 ? (
          <div className="empty-note">No internal technician notes yet.</div>
        ) : (
          entries.map((entry) => (
            <div className="journal-entry" key={entry.id}>
              <div className="journal-entry-main">
                <div className="journal-date">{formatDateTime(entry.at)}</div>
                <div>{entry.text}</div>
              </div>
              <button className="button small subtle delete-button" onClick={() => onDelete(entry.id)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </article>
  )
}

function AuthScreen({
  authState,
  authMode,
  authForm,
  authBusy,
  onAuthFormChange,
  onGoogleSignIn,
  onModeChange,
  onSubmit,
}) {
  return (
    <div className="workspace-shell auth-shell">
      <div className="auth-panel">
        <div className="eyebrow">BuildPortal</div>
        <h1>Sign in and get into the build.</h1>
        <p>
          Shops and customers can both sign in here. Use email and password right on the page, or continue with Google.
        </p>
        <div className="auth-tabs">
          <button className={`auth-tab ${authMode === 'sign-in' ? 'active' : ''}`} onClick={() => onModeChange('sign-in')} type="button">Sign in</button>
          <button className={`auth-tab ${authMode === 'sign-up' ? 'active' : ''}`} onClick={() => onModeChange('sign-up')} type="button">Create account</button>
        </div>
        <form className="stack-form auth-form" onSubmit={onSubmit}>
          <label>
            <span className="field-label">Email address</span>
            <input onChange={(event) => onAuthFormChange('email', event.target.value)} placeholder="name@example.com" type="email" value={authForm.email} />
          </label>
          <label>
            <span className="field-label">Password</span>
            <input onChange={(event) => onAuthFormChange('password', event.target.value)} placeholder="Enter your password" type="password" value={authForm.password} />
          </label>
          {authMode === 'sign-up' ? (
            <>
              <label>
                <span className="field-label">Account type</span>
                <select onChange={(event) => onAuthFormChange('role', event.target.value)} value={authForm.role}>
                  {roles.map((roleOption) => <option key={roleOption} value={roleOption}>{roleOption}</option>)}
                </select>
              </label>
              <label>
                <span className="field-label">Your name</span>
                <input onChange={(event) => onAuthFormChange('fullName', event.target.value)} placeholder="Your name" value={authForm.fullName} />
              </label>
              {authForm.role === 'shop' ? (
                <label>
                  <span className="field-label">Shop name</span>
                  <input onChange={(event) => onAuthFormChange('shopName', event.target.value)} placeholder="Shop name" value={authForm.shopName} />
                </label>
              ) : null}
            </>
          ) : null}
          <button className="button primary" disabled={authBusy} type="submit">
            {authBusy ? 'Working...' : authMode === 'sign-up' ? 'Create account' : 'Sign in'}
          </button>
          <button className="button google-button" disabled={authBusy} onClick={onGoogleSignIn} type="button">Continue with Google</button>
        </form>
        <div className="auth-points">
          <div>
            <strong>First-time setup</strong>
            <span>Create the account here, then finish your role setup inside the app if needed.</span>
          </div>
          <div>
            <strong>Shop access</strong>
            <span>Shops can manage builds, parts, wiring, tunes, and settings.</span>
          </div>
          <div>
            <strong>Customer access</strong>
            <span>Customers can use the same sign-in flow and see a simplified workspace.</span>
          </div>
        </div>
        <div className="auth-status">
          {authState.status === 'loading' ? 'Checking session...' : 'Signed out'}
        </div>
      </div>
    </div>
  )
}

function ProfileSetupScreen({ authBusy, authForm, onChange, onSubmit, userEmail }) {
  return (
    <div className="workspace-shell auth-shell">
      <div className="auth-panel">
        <div className="eyebrow">BuildPortal</div>
        <h1>Finish your account setup.</h1>
        <p>This only takes a moment. Pick whether this account is for the shop or for a customer login, then save it.</p>
        <div className="auth-status">Signed in as {userEmail}</div>
        <form className="stack-form auth-form" onSubmit={onSubmit}>
          <label>
            <span className="field-label">Account type</span>
            <select onChange={(event) => onChange('role', event.target.value)} value={authForm.role}>
              {roles.map((roleOption) => <option key={roleOption} value={roleOption}>{roleOption}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">Your name</span>
            <input onChange={(event) => onChange('fullName', event.target.value)} placeholder="Your name" value={authForm.fullName} />
          </label>
          {authForm.role === 'shop' ? (
            <label>
              <span className="field-label">Shop name</span>
              <input onChange={(event) => onChange('shopName', event.target.value)} placeholder="Shop name" value={authForm.shopName} />
            </label>
          ) : null}
          <button className="button primary" disabled={authBusy} type="submit">{authBusy ? 'Saving...' : 'Save account setup'}</button>
        </form>
      </div>
    </div>
  )
}

function App() {
  const [workspace, setWorkspace] = useState(() => cloneWorkspace(demoWorkspace))
  const [activeBuildId, setActiveBuildId] = useState(demoWorkspace.builds[0].id)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [notice, setNotice] = useState('')
  const [authState, setAuthState] = useState({ status: cloudEnabled ? 'loading' : 'demo', session: null })
  const [profile, setProfile] = useState(null)
  const [authMode, setAuthMode] = useState('sign-in')
  const [authBusy, setAuthBusy] = useState(false)
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    role: 'shop',
    fullName: '',
    shopName: '',
  })
  const [role, setRole] = useState('shop')
  const [partsQuery, setPartsQuery] = useState('')
  const [partsFilter, setPartsFilter] = useState('all')
  const [pinQuery, setPinQuery] = useState('')
  const [newLog, setNewLog] = useState('')
  const [newBuild, setNewBuild] = useState({ name: '', vehicleYear: '', vehicleMake: 'Nissan', vehicleModel: 'D21 Pickup', status: 'Planning' })
  const [newPart, setNewPart] = useState({ name: '', category: 'Engine', qty: 1, unitCost: '', status: 'planned' })
  const [newPin, setNewPin] = useState({ pin: '', function: '', type: 'Analog 0-5V' })
  const [newTune, setNewTune] = useState({ version: '', name: '', status: 'Testing', power: '', torque: '', boost: '' })
  const [techDrafts, setTechDrafts] = useState({ dashboard: '', parts: '', wiring: '', tunes: '', journal: '' })
  const deferredPartsQuery = useDeferredValue(partsQuery)
  const deferredPinQuery = useDeferredValue(pinQuery)

  useEffect(() => {
    let ignore = false

    async function hydrateCloudSession(session) {
      if (!session?.user || ignore) return

      const [cloudWorkspace, nextProfile] = await Promise.all([
        loadWorkspace(session.user.id),
        getProfile(session.user.id),
      ])

      if (ignore) return

      setWorkspace(cloudWorkspace)
      setActiveBuildId(cloudWorkspace.builds[0]?.id ?? demoWorkspace.builds[0].id)
      setProfile(nextProfile)
      setRole(nextProfile?.role || 'shop')
      setAuthForm((current) => ({
        ...current,
        email: session.user.email || current.email,
        fullName: nextProfile?.full_name || current.fullName,
        shopName: nextProfile?.shop_name || current.shopName,
        role: nextProfile?.role || current.role,
      }))
      setAuthState({ status: nextProfile ? 'cloud' : 'setup', session })
    }

    async function boot() {
      const session = await getSession()
      if (ignore) return

      if (session) {
        await hydrateCloudSession(session)
        return
      }

      const localWorkspace = await loadWorkspace()
      if (!ignore) {
        setWorkspace(localWorkspace)
        setActiveBuildId(localWorkspace.builds[0]?.id ?? demoWorkspace.builds[0].id)
        setAuthState({ status: cloudEnabled ? 'signed-out' : 'demo', session: null })
        setProfile(null)
        setRole('shop')
      }
    }

    boot()

    const subscription = subscribeToAuth(async (session) => {
      if (session?.user) {
        await hydrateCloudSession(session)
        setNotice('Cloud session connected.')
        return
      }

      const localWorkspace = await loadWorkspace()
      setWorkspace(localWorkspace)
      setActiveBuildId(localWorkspace.builds[0]?.id ?? demoWorkspace.builds[0].id)
      setAuthState({ status: cloudEnabled ? 'signed-out' : 'demo', session: null })
      setProfile(null)
      setAuthForm((current) => ({ ...current, password: '' }))
      setRole('shop')
    })

    return () => {
      ignore = true
      subscription?.unsubscribe?.()
    }
  }, [])

  useEffect(() => {
    if (!notice) return undefined
    const timeout = window.setTimeout(() => setNotice(''), 2800)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const activeBuild = useMemo(
    () => workspace.builds.find((build) => build.id === activeBuildId) ?? workspace.builds[0] ?? emptyBuild,
    [activeBuildId, workspace.builds],
  )

  const metrics = useMemo(() => getMetrics(activeBuild), [activeBuild])

  const filteredParts = useMemo(() => {
    const query = deferredPartsQuery.trim().toLowerCase()
    return activeBuild.parts.filter((part) => {
      const matchesFilter = partsFilter === 'all' ? true : part.status === partsFilter
      const haystack = [part.name, part.category, part.vendor, part.notes].join(' ').toLowerCase()
      const matchesQuery = query ? haystack.includes(query) : true
      return matchesFilter && matchesQuery
    })
  }, [activeBuild.parts, deferredPartsQuery, partsFilter])

  const filteredPins = useMemo(() => {
    const query = deferredPinQuery.trim().toLowerCase()
    return activeBuild.pins.filter((pin) => {
      const haystack = [pin.pin, pin.function, pin.type].join(' ').toLowerCase()
      return query ? haystack.includes(query) : true
    })
  }, [activeBuild.pins, deferredPinQuery])

  function persistWorkspace(nextWorkspace, buildIdOverride) {
    setWorkspace(nextWorkspace)

    if (authState.status === 'cloud' && authState.session?.user) {
      const targetBuildId = buildIdOverride ?? activeBuildId
      const targetBuild = nextWorkspace.builds.find((build) => build.id === targetBuildId) ?? nextWorkspace.builds[0]
      if (targetBuild) saveBuild(targetBuild, authState.session.user.id)
      return
    }

    saveWorkspaceLocal(nextWorkspace)
  }

  function updateActiveBuild(recipe) {
    const nextWorkspace = {
      ...workspace,
      builds: workspace.builds.map((build) => (build.id === activeBuild.id ? recipe(build) : build)),
    }
    persistWorkspace(nextWorkspace)
  }

  function addTechnicianNote(sectionKey) {
    const text = techDrafts[sectionKey]?.trim()
    if (!text) return

    updateActiveBuild((build) => ({
      ...build,
      technicianNotes: {
        ...(build.technicianNotes || {}),
        [sectionKey]: [
          { id: makeId('tech-note'), at: new Date().toISOString(), text },
          ...((build.technicianNotes?.[sectionKey]) || []),
        ],
      },
      updatedAt: new Date().toISOString(),
    }))

    setTechDrafts((current) => ({ ...current, [sectionKey]: '' }))
    setNotice('Technician note added.')
  }

  function deleteTechnicianNote(sectionKey, noteId) {
    updateActiveBuild((build) => ({
      ...build,
      technicianNotes: {
        ...(build.technicianNotes || {}),
        [sectionKey]: ((build.technicianNotes?.[sectionKey]) || []).filter((entry) => entry.id !== noteId),
      },
      updatedAt: new Date().toISOString(),
    }))
    setNotice('Technician note deleted.')
  }

  function updateShopField(field, value) {
    persistWorkspace({
      ...workspace,
      shop: { ...workspace.shop, [field]: value },
    })
  }

  function updateBuildField(field, value) {
    updateActiveBuild((build) => ({ ...build, [field]: value, updatedAt: new Date().toISOString() }))
  }

  function updateBuildVehicleField(field, value) {
    updateActiveBuild((build) => {
      const next = { ...build, [field]: value, updatedAt: new Date().toISOString() }
      next.vehicle = getVehicleLabel(next)
      return next
    })
  }

  function updateBuildBudget(value) {
    updateActiveBuild((build) => ({
      ...build,
      budget: { ...build.budget, target: Number(value) || 0 },
      updatedAt: new Date().toISOString(),
    }))
  }

  function updateClientField(field, value) {
    updateActiveBuild((build) => ({
      ...build,
      client: { ...build.client, [field]: value },
      updatedAt: new Date().toISOString(),
    }))
  }

  function deleteBuild(buildId) {
    if (workspace.builds.length <= 1) {
      setNotice('You need to keep at least one build.')
      return
    }

    const nextBuilds = workspace.builds.filter((build) => build.id !== buildId)
    const nextActive = activeBuildId === buildId ? nextBuilds[0].id : activeBuildId
    persistWorkspace({ ...workspace, builds: nextBuilds }, nextActive)
    if (activeBuildId === buildId) {
      setActiveBuildId(nextActive)
      setActiveTab('dashboard')
    }
    setNotice('Build deleted.')
  }

  function updatePhase(phaseId, key, value) {
    updateActiveBuild((build) => ({
      ...build,
      phases: build.phases.map((phase) => (phase.id === phaseId ? { ...phase, [key]: value } : phase)),
      updatedAt: new Date().toISOString(),
    }))
  }

  function addBuild(event) {
    event.preventDefault()
    if (!newBuild.name.trim()) return

    const now = new Date().toISOString()
    const build = {
      id: makeId('build'),
      slug: slugify(newBuild.name),
      name: newBuild.name.trim(),
      vehicleYear: newBuild.vehicleYear,
      vehicleMake: newBuild.vehicleMake,
      vehicleModel: newBuild.vehicleModel,
      vehicle: [newBuild.vehicleYear, newBuild.vehicleMake, newBuild.vehicleModel].filter(Boolean).join(' ') || 'Year Make Model',
      status: newBuild.status,
      brief: '',
      nextMilestone: '',
      portalSummary: '',
      updatedAt: now,
      budget: { target: 0 },
      client: { name: '', email: '', portalStatus: 'Not invited' },
      phases: [
        { id: makeId('phase'), name: 'Scope project', owner: '', done: false },
        { id: makeId('phase'), name: 'Plan parts', owner: '', done: false },
        { id: makeId('phase'), name: 'Fabrication / install', owner: '', done: false },
      ],
      parts: [],
      pins: [],
      tunes: [],
      technicianNotes: getEmptyTechnicianNotes(),
      journal: [{ id: makeId('log'), at: now, text: 'Build created.' }],
    }

    const nextWorkspace = { ...workspace, builds: [build, ...workspace.builds] }
    persistWorkspace(nextWorkspace, build.id)
    startTransition(() => {
      setActiveBuildId(build.id)
      setActiveTab('dashboard')
    })
    setNewBuild({ name: '', vehicleYear: '', vehicleMake: 'Nissan', vehicleModel: 'D21 Pickup', status: 'Planning' })
    setNotice('Build created.')
  }

  function addPart(event) {
    event.preventDefault()
    if (!newPart.name.trim()) return

    updateActiveBuild((build) => ({
      ...build,
      parts: [
        {
          id: makeId('part'),
          name: newPart.name.trim(),
          category: newPart.category || 'General',
          qty: Number(newPart.qty) || 1,
          unitCost: Number(newPart.unitCost) || 0,
          status: newPart.status,
          vendor: '',
          notes: '',
        },
        ...build.parts,
      ],
      updatedAt: new Date().toISOString(),
    }))

    setNewPart({ name: '', category: 'Engine', qty: 1, unitCost: '', status: 'planned' })
    setNotice('Part added.')
  }

  function deletePart(partId) {
    updateActiveBuild((build) => ({
      ...build,
      parts: build.parts.filter((part) => part.id !== partId),
      updatedAt: new Date().toISOString(),
    }))
    setNotice('Part deleted.')
  }

  function addPin(event) {
    event.preventDefault()
    if (!newPin.pin.trim()) return

    updateActiveBuild((build) => ({
      ...build,
      pins: [
        {
          id: makeId('pin'),
          pin: newPin.pin.trim(),
          function: newPin.function.trim(),
          type: newPin.type,
          verified: false,
        },
        ...build.pins,
      ],
      updatedAt: new Date().toISOString(),
    }))

    setNewPin({ pin: '', function: '', type: 'Analog 0-5V' })
    setNotice('Pin added.')
  }

  function deletePin(pinId) {
    updateActiveBuild((build) => ({
      ...build,
      pins: build.pins.filter((pin) => pin.id !== pinId),
      updatedAt: new Date().toISOString(),
    }))
    setNotice('Pin deleted.')
  }

  function addTune(event) {
    event.preventDefault()
    if (!newTune.version.trim() || !newTune.name.trim()) return

    updateActiveBuild((build) => ({
      ...build,
      tunes: [
        {
          id: makeId('tune'),
          version: newTune.version.trim(),
          name: newTune.name.trim(),
          status: newTune.status,
          date: new Date().toISOString(),
          power: Number(newTune.power) || null,
          torque: Number(newTune.torque) || null,
          boost: Number(newTune.boost) || null,
          notes: '',
        },
        ...build.tunes,
      ],
      updatedAt: new Date().toISOString(),
    }))

    setNewTune({ version: '', name: '', status: 'Testing', power: '', torque: '', boost: '' })
    setNotice('Tune entry added.')
  }

  function deleteTune(tuneId) {
    updateActiveBuild((build) => ({
      ...build,
      tunes: build.tunes.filter((tune) => tune.id !== tuneId),
      updatedAt: new Date().toISOString(),
    }))
    setNotice('Tune entry deleted.')
  }

  function downloadTuneSource(tune) {
    if (!tune.rawText) return
    const blob = new Blob([tune.rawText], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = tune.sourceFile || `${tune.version || 'tune'}.msq`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function importTuneFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const parsed = summarizeTuneImport(file.name, text)

    updateActiveBuild((build) => ({
      ...build,
      tunes: [
        {
          id: makeId('tune'),
          version: parsed.version || `import-${build.tunes.length + 1}`,
          name: parsed.name || 'Imported tune',
          status: 'Archived',
          date: new Date().toISOString(),
          power: null,
          torque: null,
          boost: null,
          notes: parsed.summary || 'Imported from a Speeduino / TunerStudio tune file.',
          sourceFile: file.name,
          fileSize: file.size,
          rawText: text,
          importedAt: new Date().toISOString(),
        },
        ...build.tunes,
      ],
      updatedAt: new Date().toISOString(),
    }))

    event.target.value = ''
    setNotice(`Imported ${file.name}`)
  }

  function addLogEntry(event) {
    event.preventDefault()
    const trimmed = newLog.trim()
    if (!trimmed) return

    updateActiveBuild((build) => ({
      ...build,
      journal: [{ id: makeId('log'), at: new Date().toISOString(), text: trimmed }, ...build.journal],
      updatedAt: new Date().toISOString(),
    }))

    setNewLog('')
    setNotice('Journal entry added.')
  }

  function deleteJournalEntry(entryId) {
    updateActiveBuild((build) => ({
      ...build,
      journal: build.journal.filter((entry) => entry.id !== entryId),
      updatedAt: new Date().toISOString(),
    }))
    setNotice('Journal entry deleted.')
  }

  function cyclePartStatus(partId) {
    updateActiveBuild((build) => ({
      ...build,
      parts: build.parts.map((part) => {
        if (part.id !== partId) return part
        const index = partsStatuses.indexOf(part.status)
        return { ...part, status: partsStatuses[(index + 1) % partsStatuses.length] }
      }),
      updatedAt: new Date().toISOString(),
    }))
  }

  function togglePin(pinId) {
    updateActiveBuild((build) => ({
      ...build,
      pins: build.pins.map((pin) => (pin.id === pinId ? { ...pin, verified: !pin.verified } : pin)),
      updatedAt: new Date().toISOString(),
    }))
  }

  function updateAuthForm(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }))
  }

  async function persistProfile(overrides = {}) {
    const user = authState.session?.user
    if (!user) return { ok: false, message: 'No active session found.' }

    const nextProfile = {
      id: user.id,
      role: overrides.role || authForm.role,
      full_name: (overrides.fullName ?? authForm.fullName).trim(),
      shop_name: (overrides.shopName ?? authForm.shopName).trim(),
    }

    const result = await upsertProfile(nextProfile)
    if (!result.ok) return result

    setProfile(nextProfile)
    setRole(nextProfile.role)
    setAuthState((current) => ({ ...current, status: 'cloud' }))
    setAuthForm((current) => ({
      ...current,
      fullName: nextProfile.full_name,
      shopName: nextProfile.shop_name,
      role: nextProfile.role,
    }))
    return { ok: true }
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()

    const email = authForm.email.trim()
    const password = authForm.password
    if (!email || !password) {
      setNotice('Enter both email and password.')
      return
    }

    setAuthBusy(true)

    try {
      if (authMode === 'sign-up') {
        const signUpResult = await signUpWithPassword(email, password)
        if (!signUpResult.ok) {
          setNotice(signUpResult.message)
          return
        }

        const signInResult = await signInWithPassword(email, password)
        if (!signInResult.ok) {
          setNotice(signInResult.message)
          return
        }

        setNotice('Account created. Finish your setup below.')
        return
      }

      const signInResult = await signInWithPassword(email, password)
      setNotice(signInResult.ok ? 'Signed in.' : signInResult.message)
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleGoogleSignIn() {
    setAuthBusy(true)
    try {
      const result = await signInWithGoogle()
      if (!result.ok) setNotice(result.message)
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleProfileSetup(event) {
    event.preventDefault()
    if (!authForm.fullName.trim()) {
      setNotice('Add a name to finish setup.')
      return
    }
    if (authForm.role === 'shop' && !authForm.shopName.trim()) {
      setNotice('Add a shop name for the shop account.')
      return
    }

    setAuthBusy(true)
    try {
      const result = await persistProfile()
      setNotice(result.ok ? 'Account setup saved.' : result.message)
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    setNotice('Signed out.')
  }

  async function updateRole(nextRole) {
    setRole(nextRole)
    if (nextRole === 'customer' && ['builds'].includes(activeTab)) {
      setActiveTab('dashboard')
    }

    if (authState.status === 'cloud' && authState.session?.user) {
      const result = await persistProfile({ role: nextRole })
      setNotice(result.ok ? `Role set to ${nextRole}.` : result.message)
      return
    }

    setNotice(`Role set to ${nextRole}.`)
  }

  const visibleTabs = role === 'customer' ? customerTabs : tabs
  const isShop = role === 'shop'

  if (cloudEnabled && authState.status === 'loading') {
    return (
      <div className="workspace-shell auth-shell">
        <div className="auth-panel">
          <div className="eyebrow">BuildPortal</div>
          <h1>Checking your session.</h1>
          <div className="auth-status">Loading account data...</div>
        </div>
      </div>
    )
  }

  if (cloudEnabled && authState.status === 'signed-out') {
    return (
      <AuthScreen
        authState={authState}
        authBusy={authBusy}
        authForm={authForm}
        authMode={authMode}
        onAuthFormChange={updateAuthForm}
        onGoogleSignIn={handleGoogleSignIn}
        onModeChange={setAuthMode}
        onSubmit={handleAuthSubmit}
      />
    )
  }

  if (cloudEnabled && authState.status === 'setup') {
    return (
      <ProfileSetupScreen
        authBusy={authBusy}
        authForm={authForm}
        onChange={updateAuthForm}
        onSubmit={handleProfileSetup}
        userEmail={authState.session?.user?.email || authForm.email}
      />
    )
  }

  return (
    <div className="workspace-shell">
      <header className="app-header">
        <div className="header-main">
          <div>
            <div className="eyebrow">{workspace.shop.name || 'BuildPortal'}</div>
            <h1>{activeBuild.name}</h1>
            <p className="header-subtitle">
              {getVehicleLabel(activeBuild)} | {activeBuild.status} | Updated {formatDateTime(activeBuild.updatedAt)}
            </p>
          </div>
          <div className="header-actions">
            <button className="button ghost" onClick={() => startTransition(() => setActiveTab('settings'))}>
              Account
            </button>
            <button className="button primary" disabled={!isShop} onClick={() => startTransition(() => setActiveTab('builds'))}>
              New build
            </button>
          </div>
        </div>

        <div className="stat-bar">
          <div className="stat-item"><span>Total builds</span><strong>{workspace.builds.length}</strong></div>
          <div className="stat-item"><span>Completion</span><strong>{metrics.completion}%</strong></div>
          <div className="stat-item"><span>Installed parts</span><strong>{metrics.installed}</strong></div>
          <div className="stat-item"><span>Ordered / quoted</span><strong>{metrics.ordered}</strong></div>
          <div className="stat-item"><span>Parts spend</span><strong>{money.format(metrics.spend)}</strong></div>
          <div className="stat-item"><span>Pins verified</span><strong>{metrics.verified}/{activeBuild.pins.length}</strong></div>
        </div>
      </header>

      <nav className="top-nav">
        {visibleTabs.map((tab) => (
          <button
            className={`top-nav-button ${tab === activeTab ? 'active' : ''}`}
            key={tab}
            onClick={() => startTransition(() => setActiveTab(tab))}
          >
            {tab}
          </button>
        ))}
      </nav>

      <main className="main-area">
        {notice && <div className="notice">{notice}</div>}
        {workspace.builds.length === 0 && activeTab !== 'settings' ? (
          <div className="notice">
            {isShop
              ? 'This account does not have any builds yet. Open the Builds tab to create the first one.'
              : 'No builds are linked to this customer account yet. Ask the shop to set your email on a build.'}
          </div>
        ) : null}

        {activeTab === 'dashboard' && (
          <section className="page-section">
            <div className="section-grid two">
              <article className="card">
                <div className="card-title">Current build summary</div>
                <div className="summary-list">
                  <div><span>Brief</span><strong>{activeBuild.brief || 'No build brief yet.'}</strong></div>
                  <div><span>Next milestone</span><strong>{activeBuild.nextMilestone || 'No next milestone yet.'}</strong></div>
                  <div><span>Customer-facing summary</span><strong>{activeBuild.portalSummary || 'No portal summary yet.'}</strong></div>
                </div>
              </article>

              <article className="card">
                <div className="card-title">Customer and budget</div>
                <div className="summary-list">
                  <div><span>Client name</span><strong>{activeBuild.client.name || 'Not set'}</strong></div>
                  <div><span>Client email</span><strong>{activeBuild.client.email || 'Not set'}</strong></div>
                  <div><span>Budget target</span><strong>{money.format(activeBuild.budget.target)}</strong></div>
                  <div><span>Portal status</span><strong>{activeBuild.client.portalStatus}</strong></div>
                </div>
              </article>
            </div>

            <article className="card">
              <div className="card-title">Phase checklist</div>
              <div className="phase-table">
                {activeBuild.phases.map((phase) => (
                  <div className="phase-row-item" key={phase.id}>
                    <input checked={phase.done} disabled={!isShop} onChange={(event) => updatePhase(phase.id, 'done', event.target.checked)} type="checkbox" />
                    <input disabled={!isShop} onChange={(event) => updatePhase(phase.id, 'name', event.target.value)} placeholder="Phase name" value={phase.name} />
                    <input disabled={!isShop} onChange={(event) => updatePhase(phase.id, 'owner', event.target.value)} placeholder="Owner" value={phase.owner} />
                  </div>
                ))}
              </div>
            </article>

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.dashboard}
                entries={activeBuild.technicianNotes?.dashboard || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, dashboard: value }))}
                onDelete={(noteId) => deleteTechnicianNote('dashboard', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('dashboard') }}
                title="Dashboard technician notes"
              />
            ) : null}
          </section>
        )}

        {activeTab === 'builds' && (
          <section className="page-section">
            <article className="card">
              <div className="card-title">Build selector</div>
              <div className="build-list-table">
                {workspace.builds.map((build) => (
                  <div className={`build-row ${build.id === activeBuild.id ? 'active' : ''}`} key={build.id}>
                    <button
                      className="build-select-button"
                      onClick={() => {
                        startTransition(() => {
                          setActiveBuildId(build.id)
                          setActiveTab('dashboard')
                        })
                      }}
                    >
                      <strong>{build.name}</strong>
                      <span>{getVehicleLabel(build)}</span>
                    </button>
                    <div className="row-actions">
                      <span className={`pill ${statusClass(build.status)}`}>{build.status}</span>
                      <button className="button small subtle delete-button" onClick={(event) => { event.stopPropagation(); deleteBuild(build.id) }}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <div className="card-title">Add build</div>
              <form className="form-grid three" onSubmit={addBuild}>
                <input onChange={(event) => setNewBuild({ ...newBuild, name: event.target.value })} placeholder="Build name" value={newBuild.name} />
                <select onChange={(event) => setNewBuild({ ...newBuild, vehicleYear: event.target.value })} value={newBuild.vehicleYear}>
                  <option value="">Year</option>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </select>
                <select onChange={(event) => setNewBuild({ ...newBuild, vehicleMake: event.target.value, vehicleModel: getModelOptions(event.target.value)[0] })} value={newBuild.vehicleMake}>
                  {makes.map((make) => <option key={make} value={make}>{make}</option>)}
                </select>
                <select onChange={(event) => setNewBuild({ ...newBuild, vehicleModel: event.target.value })} value={newBuild.vehicleModel}>
                  {getModelOptions(newBuild.vehicleMake).map((model) => <option key={model} value={model}>{model}</option>)}
                </select>
                <select onChange={(event) => setNewBuild({ ...newBuild, status: event.target.value })} value={newBuild.status}>
                  {buildStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
                <button className="button primary" type="submit">Create build</button>
              </form>
            </article>
          </section>
        )}

        {activeTab === 'parts' && (
          <section className="page-section">
            {isShop ? (
              <article className="card">
                <div className="card-title">Add part</div>
                <form className="form-grid five" onSubmit={addPart}>
                  <input onChange={(event) => setNewPart({ ...newPart, name: event.target.value })} placeholder="Part name" value={newPart.name} />
                  <select onChange={(event) => setNewPart({ ...newPart, category: event.target.value })} value={newPart.category}>
                    {partCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <input min="1" onChange={(event) => setNewPart({ ...newPart, qty: event.target.value })} type="number" value={newPart.qty} />
                  <input min="0" onChange={(event) => setNewPart({ ...newPart, unitCost: event.target.value })} placeholder="Unit cost" step="0.01" type="number" value={newPart.unitCost} />
                  <select onChange={(event) => setNewPart({ ...newPart, status: event.target.value })} value={newPart.status}>
                    {partsStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <button className="button primary" type="submit">Add part</button>
                </form>
              </article>
            ) : null}

            <article className="card">
              <div className="card-toolbar">
                <div className="card-title">Parts list</div>
                <div className="toolbar-controls">
                  <input onChange={(event) => setPartsQuery(event.target.value)} placeholder="Search parts" value={partsQuery} />
                  <select onChange={(event) => setPartsFilter(event.target.value)} value={partsFilter}>
                    <option value="all">All statuses</option>
                    {partsStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Part</th><th>Category</th><th>Qty</th><th>Unit</th><th>Total</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {filteredParts.length === 0 ? (
                      <tr><td className="empty-cell" colSpan="7">No parts added yet.</td></tr>
                    ) : filteredParts.map((part) => (
                      <tr key={part.id}>
                        <td><strong>{part.name}</strong><span>{part.vendor || 'No vendor listed'}</span></td>
                        <td>{part.category}</td>
                        <td>{part.qty}</td>
                        <td>{money.format(part.unitCost)}</td>
                        <td>{money.format(part.qty * part.unitCost)}</td>
                        <td><span className={`pill ${statusClass(part.status)}`}>{part.status}</span></td>
                        <td>{isShop ? <div className="row-actions"><button className="button small subtle" onClick={() => cyclePartStatus(part.id)}>Next</button><button className="button small subtle delete-button" onClick={() => deletePart(part.id)}>Delete</button></div> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.parts}
                entries={activeBuild.technicianNotes?.parts || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, parts: value }))}
                onDelete={(noteId) => deleteTechnicianNote('parts', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('parts') }}
                title="Parts technician notes"
              />
            ) : null}
          </section>
        )}

        {activeTab === 'wiring' && (
          <section className="page-section">
            {isShop ? (
              <article className="card">
                <div className="card-title">Add pin / signal</div>
                <form className="form-grid four" onSubmit={addPin}>
                  <input onChange={(event) => setNewPin({ ...newPin, pin: event.target.value })} placeholder="Pin label" value={newPin.pin} />
                  <input onChange={(event) => setNewPin({ ...newPin, function: event.target.value })} placeholder="Function" value={newPin.function} />
                  <select onChange={(event) => setNewPin({ ...newPin, type: event.target.value })} value={newPin.type}>
                    {pinTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <button className="button primary" type="submit">Add pin</button>
                </form>
              </article>
            ) : null}

            <article className="card">
              <div className="card-toolbar">
                <div className="card-title">Wiring / pin map</div>
                <div className="toolbar-controls single">
                  <input onChange={(event) => setPinQuery(event.target.value)} placeholder="Search pins" value={pinQuery} />
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Pin</th><th>Function</th><th>Type</th><th>Verified</th><th /></tr>
                  </thead>
                  <tbody>
                    {filteredPins.length === 0 ? (
                      <tr><td className="empty-cell" colSpan="5">No wiring items added yet.</td></tr>
                    ) : filteredPins.map((pin) => (
                      <tr key={pin.id}>
                        <td>{pin.pin}</td>
                        <td>{pin.function || '-'}</td>
                        <td>{pin.type || '-'}</td>
                        <td>
                          <button className={`pill buttonless ${pin.verified ? 'good' : 'neutral'}`} disabled={!isShop} onClick={() => togglePin(pin.id)}>
                            {pin.verified ? 'Verified' : 'Needs check'}
                          </button>
                        </td>
                        <td>{isShop ? <button className="button small subtle delete-button" onClick={() => deletePin(pin.id)}>Delete</button> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.wiring}
                entries={activeBuild.technicianNotes?.wiring || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, wiring: value }))}
                onDelete={(noteId) => deleteTechnicianNote('wiring', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('wiring') }}
                title="Wiring technician notes"
              />
            ) : null}
          </section>
        )}

        {activeTab === 'tunes' && (
          <section className="page-section">
            {isShop ? (
              <>
                <article className="card">
                  <div className="card-title">Import Speeduino / TunerStudio map</div>
                  <div className="stack-form">
                    <input accept=".msq,.txt,.json,.tun" onChange={importTuneFile} type="file" />
                    <div className="info-line">
                      Imports the tune file into the archive so you can keep each revision with its original source.
                    </div>
                  </div>
                </article>

                <article className="card">
                  <div className="card-title">Add tune entry</div>
                  <form className="form-grid six" onSubmit={addTune}>
                    <input onChange={(event) => setNewTune({ ...newTune, version: event.target.value })} placeholder="Version" value={newTune.version} />
                    <input onChange={(event) => setNewTune({ ...newTune, name: event.target.value })} placeholder="Tune name" value={newTune.name} />
                    <select onChange={(event) => setNewTune({ ...newTune, status: event.target.value })} value={newTune.status}>
                      {tuneStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                    <input onChange={(event) => setNewTune({ ...newTune, power: event.target.value })} placeholder="WHP" type="number" value={newTune.power} />
                    <input onChange={(event) => setNewTune({ ...newTune, torque: event.target.value })} placeholder="WTQ" type="number" value={newTune.torque} />
                    <input onChange={(event) => setNewTune({ ...newTune, boost: event.target.value })} placeholder="Boost PSI" step="0.5" type="number" value={newTune.boost} />
                    <button className="button primary" type="submit">Add tune</button>
                  </form>
                </article>
              </>
            ) : null}

            <article className="card">
              <div className="card-title">Tune log</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Version</th><th>Name</th><th>Status</th><th>Source</th><th>WHP</th><th>WTQ</th><th>Boost</th><th>Date</th><th /></tr>
                  </thead>
                  <tbody>
                    {activeBuild.tunes.length === 0 ? (
                      <tr><td className="empty-cell" colSpan="9">No tune entries yet.</td></tr>
                    ) : activeBuild.tunes.map((tune) => (
                      <tr key={tune.id}>
                        <td>{tune.version}</td>
                        <td>
                          <strong>{tune.name}</strong>
                          <span>{tune.notes || '-'}</span>
                        </td>
                        <td><span className={`pill ${statusClass(tune.status)}`}>{tune.status}</span></td>
                        <td>{tune.sourceFile || 'Manual entry'}</td>
                        <td>{tune.power ?? '-'}</td>
                        <td>{tune.torque ?? '-'}</td>
                        <td>{tune.boost ?? '-'}</td>
                        <td>{formatDate(tune.date)}</td>
                        <td>{isShop ? <div className="row-actions">{tune.rawText ? <button className="button small subtle" onClick={() => downloadTuneSource(tune)}>Download</button> : null}<button className="button small subtle delete-button" onClick={() => deleteTune(tune.id)}>Delete</button></div> : (tune.rawText ? <button className="button small subtle" onClick={() => downloadTuneSource(tune)}>Download</button> : '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.tunes}
                entries={activeBuild.technicianNotes?.tunes || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, tunes: value }))}
                onDelete={(noteId) => deleteTechnicianNote('tunes', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('tunes') }}
                title="Tune technician notes"
              />
            ) : null}
          </section>
        )}

        {activeTab === 'journal' && (
          <section className="page-section">
            {isShop ? (
              <article className="card">
                <div className="card-title">Add journal entry</div>
                <form className="stack-form" onSubmit={addLogEntry}>
                  <textarea onChange={(event) => setNewLog(event.target.value)} placeholder="What changed, what did you learn, what needs to happen next?" rows="4" value={newLog} />
                  <button className="button primary" type="submit">Save entry</button>
                </form>
              </article>
            ) : null}

            <article className="card">
              <div className="card-title">Build journal</div>
              <div className="journal-list">
                {activeBuild.journal.map((entry) => (
                  <div className="journal-entry" key={entry.id}>
                    <div className="journal-entry-main">
                      <div className="journal-date">{formatDateTime(entry.at)}</div>
                      <div>{entry.text}</div>
                    </div>
                    {isShop ? <button className="button small subtle delete-button" onClick={() => deleteJournalEntry(entry.id)}>Delete</button> : null}
                  </div>
                ))}
              </div>
            </article>

            {isShop ? (
              <TechnicianNotes
                draft={techDrafts.journal}
                entries={activeBuild.technicianNotes?.journal || []}
                onChange={(value) => setTechDrafts((current) => ({ ...current, journal: value }))}
                onDelete={(noteId) => deleteTechnicianNote('journal', noteId)}
                onSubmit={(event) => { event.preventDefault(); addTechnicianNote('journal') }}
                title="Journal technician notes"
              />
            ) : null}
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="page-section">
            <div className="section-grid two">
              <article className="card">
                <div className="card-title">Account and role</div>
                <div className="settings-copy account-screen">
                  <p>The signed-in account below is the one using this workspace. Shop users can edit everything. Customer users get the cleaner read-only portal view.</p>
                  {authState.status === 'cloud' && (
                    <div className="stack-form">
                      <div className="info-line">Signed in as {authState.session.user.email}</div>
                      <label>
                        <span className="field-label">Workspace role</span>
                        <select onChange={(event) => updateRole(event.target.value)} value={role}>
                          {roles.map((roleOption) => <option key={roleOption} value={roleOption}>{roleOption}</option>)}
                        </select>
                      </label>
                      <label>
                        <span className="field-label">Your name</span>
                        <input onChange={(event) => updateAuthForm('fullName', event.target.value)} value={authForm.fullName} />
                      </label>
                      {role === 'shop' ? (
                        <label>
                          <span className="field-label">Shop name</span>
                          <input onChange={(event) => updateAuthForm('shopName', event.target.value)} value={authForm.shopName} />
                        </label>
                      ) : null}
                      <div className="info-line">
                        Google sign-in is available from the account screen, and email/password sign-in happens directly in the app instead of through emailed links.
                      </div>
                      <button className="button primary" disabled={authBusy} onClick={() => persistProfile().then((result) => setNotice(result.ok ? 'Account details saved.' : result.message))}>Save account details</button>
                      <button className="button ghost" onClick={handleSignOut}>Sign out</button>
                    </div>
                  )}
                </div>
              </article>

              {isShop ? (
                <article className="card">
                  <div className="card-title">Shop settings</div>
                  <div className="stack-form">
                    <label><span className="field-label">App / shop name</span><input onChange={(event) => updateShopField('name', event.target.value)} value={workspace.shop.name} /></label>
                    <label><span className="field-label">Subtitle</span><input onChange={(event) => updateShopField('subtitle', event.target.value)} value={workspace.shop.subtitle} /></label>
                    <label><span className="field-label">Shop email</span><input onChange={(event) => updateShopField('email', event.target.value)} value={workspace.shop.email} /></label>
                  </div>
                </article>
              ) : (
                <article className="card">
                  <div className="card-title">Customer access</div>
                  <div className="settings-copy">
                    <p>You are in customer mode. This view is meant for progress review, tune history, and shared build updates.</p>
                    <p className="info-line">If you need shop-level editing, switch the role back to `shop` from the role selector above.</p>
                  </div>
                </article>
              )}
            </div>

            {isShop ? (
              <article className="card">
                <div className="card-title">Active build details</div>
                <div className="form-grid two">
                  <label><span className="field-label">Build name</span><input onChange={(event) => updateBuildField('name', event.target.value)} value={activeBuild.name} /></label>
                  <label><span className="field-label">Vehicle year</span><select onChange={(event) => updateBuildVehicleField('vehicleYear', event.target.value)} value={activeBuild.vehicleYear || ''}><option value="">Year</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label>
                  <label><span className="field-label">Vehicle make</span><select onChange={(event) => updateActiveBuild((build) => { const vehicleMake = event.target.value; const vehicleModel = getModelOptions(vehicleMake)[0]; const next = { ...build, vehicleMake, vehicleModel, updatedAt: new Date().toISOString() }; next.vehicle = getVehicleLabel(next); return next })} value={activeBuild.vehicleMake || 'Nissan'}>{makes.map((make) => <option key={make} value={make}>{make}</option>)}</select></label>
                  <label><span className="field-label">Vehicle model</span><select onChange={(event) => updateBuildVehicleField('vehicleModel', event.target.value)} value={activeBuild.vehicleModel || getModelOptions(activeBuild.vehicleMake || 'Nissan')[0]}>{getModelOptions(activeBuild.vehicleMake || 'Nissan').map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
                  <label><span className="field-label">Build status</span><select onChange={(event) => updateBuildField('status', event.target.value)} value={activeBuild.status}>{buildStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                  <label><span className="field-label">Budget target</span><input onChange={(event) => updateBuildBudget(event.target.value)} type="number" value={activeBuild.budget.target} /></label>
                  <label><span className="field-label">Client name</span><input onChange={(event) => updateClientField('name', event.target.value)} value={activeBuild.client.name} /></label>
                  <label><span className="field-label">Client email</span><input onChange={(event) => updateClientField('email', event.target.value)} value={activeBuild.client.email} /></label>
                  <label><span className="field-label">Portal status</span><select onChange={(event) => updateClientField('portalStatus', event.target.value)} value={activeBuild.client.portalStatus}>{portalStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
                  <label className="span-two"><span className="field-label">Build brief</span><textarea onChange={(event) => updateBuildField('brief', event.target.value)} rows="3" value={activeBuild.brief} /></label>
                  <label className="span-two"><span className="field-label">Next milestone</span><textarea onChange={(event) => updateBuildField('nextMilestone', event.target.value)} rows="3" value={activeBuild.nextMilestone} /></label>
                  <label className="span-two"><span className="field-label">Customer portal summary</span><textarea onChange={(event) => updateBuildField('portalSummary', event.target.value)} rows="3" value={activeBuild.portalSummary} /></label>
                </div>
              </article>
            ) : null}
          </section>
        )}
      </main>
    </div>
  )
}

export default App
