import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import './App.css'
import { demoWorkspace } from './data/demoWorkspace'
import {
  cloudEnabled,
  getProfile,
  getHasShopAdmin,
  getSession,
  listProfiles,
  loadWorkspace,
  saveBuild,
  saveWorkspaceLocal,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  subscribeToAuth,
  updateProfileByAdmin,
  upsertProfile,
} from './lib/dataClient'

const partsStatuses = ['planned', 'quoted', 'ordered', 'received', 'installed', 'blocked']
const tabs = ['dashboard', 'builds', 'parts', 'wiring', 'tunes', 'labor', 'journal', 'settings']
const customerTabs = ['dashboard', 'parts', 'wiring', 'tunes', 'journal', 'settings']
const roles = ['shop', 'customer']
const tiers = ['free', 'garage', 'shop']
const vehicleTypes = ['Car', 'Truck', 'Motorcycle', 'UTV', 'Boat']
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
const partCategoriesByVehicleType = {
  Car: ['Engine', 'Fuel System', 'Turbo System', 'Cooling', 'ECU / Wiring', 'Sensors', 'Suspension', 'Brakes', 'Body', 'Interior', 'Exhaust', 'General'],
  Truck: ['Engine', 'Fuel System', 'Turbo System', 'Cooling', 'ECU / Wiring', 'Sensors', 'Suspension', 'Brakes', 'Body', 'Interior', 'Exhaust', 'General'],
  Motorcycle: ['Engine', 'Fuel/Carb', 'Suspension/Forks', 'Chain/Sprockets', 'Brakes', 'Bodywork/Fairings', 'Electrical', 'Exhaust'],
  UTV: ['Engine', 'Fuel System', 'Driveline', 'Suspension', 'Brakes', 'Electrical', 'Safety Cage', 'Cooling', 'General'],
  Boat: ['Engine', 'Fuel System', 'Electrical', 'Cooling', 'Propulsion', 'Hull/Deck', 'Rigging', 'General'],
}
const pinTypes = ['Analog 0-5V', 'Analog NTC', 'Digital input', 'Digital output', 'Ground', '5V reference', 'PWM output', 'Injector output', 'Ignition output', 'Other']
const tuneStatuses = ['Testing', 'Approved', 'Archived']
const ecuPlatforms = ['Speeduino', 'Haltech', 'Link G4X', 'Motec', 'Power Commander', 'Bazzaz', 'Woolich Racing', 'AEM', 'MegaSquirt', 'Other']
const tuneTypes = ['Base Map', 'Street', 'Track', 'WOT Pull', 'E85', 'Flex Fuel', 'Dyno Pull', 'Other']
const partSources = ['OEM', 'OE Replacement', 'Aftermarket', 'Fabricated', 'Junkyard/Pull']
const buildStatuses = ['Planning', 'In Progress', 'Waiting', 'Delivered']
const portalStatuses = ['Not invited', 'Invite pending', 'Portal active', 'Portal paused']
const logChannelSuggestions = ['RPM', 'MAP', 'TPS', 'AFR', 'Lambda', 'IAT', 'CLT', 'Ignition Advance', 'Injector PW', 'Battery Voltage']
const chartColors = ['#f97316', '#6aa7ff', '#52d08d', '#f2c078']

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

function totalLaborCost(entries) {
  return entries.reduce((sum, entry) => sum + Number(entry.hours || 0) * Number(entry.rate || 0), 0)
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

function getPartCategoryOptions(vehicleType) {
  return partCategoriesByVehicleType[vehicleType] || partCategoriesByVehicleType.Truck
}

function parseDelimitedLine(line, delimiter) {
  const values = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const nextChar = line[index + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values.map((value) => value.trim())
}

function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).find((line) => line.trim())
  if (!sample) return ','
  const commaCount = (sample.match(/,/g) || []).length
  const semicolonCount = (sample.match(/;/g) || []).length
  if (!commaCount && !semicolonCount) return ''
  return semicolonCount > commaCount ? ';' : ','
}

function parseDataLogText(text, delimiter) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim())
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = parseDelimitedLine(lines[0], delimiter)
  const rows = lines.slice(1).map((line) => {
    const values = parseDelimitedLine(line, delimiter)
    return headers.reduce((accumulator, header, index) => {
      accumulator[header] = values[index] ?? ''
      return accumulator
    }, {})
  })
  return { headers, rows }
}

function detectTimeColumn(headers, rows) {
  const byName = headers.find((header) => /^(time|seconds|sec|timestamp)$/i.test(header))
  if (byName) return byName
  const firstHeader = headers[0]
  if (!firstHeader) return ''
  const numericEnough = rows.slice(0, 8).every((row) => Number.isFinite(Number(row[firstHeader])))
  return numericEnough ? firstHeader : ''
}

function normalizeChannelName(channel) {
  return channel.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function getSuggestedChannels(headers) {
  const suggestions = logChannelSuggestions
    .map((suggestion) => headers.find((header) => normalizeChannelName(header).includes(normalizeChannelName(suggestion))))
    .filter(Boolean)

  return [...new Set(suggestions)].slice(0, 4)
}

function getFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function getEmptyTechnicianNotes() {
  return { dashboard: [], parts: [], wiring: [], tunes: [], journal: [] }
}

function getAuthDisplayName(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || ''
}

const emptyBuild = {
  id: 'empty-build',
  slug: 'empty-build',
  name: 'No build selected',
  vehicleType: 'Truck',
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
  labor: [],
  shopSnapshot: { ...demoWorkspace.shop },
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
  hasShopAdmin,
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
                <select disabled={hasShopAdmin} onChange={(event) => onAuthFormChange('role', event.target.value)} value={hasShopAdmin ? 'customer' : authForm.role}>
                  {roles.map((roleOption) => <option key={roleOption} value={roleOption}>{roleOption}</option>)}
                </select>
              </label>
              {hasShopAdmin ? (
                <div className="info-line">
                  A shop admin already exists. New self-serve signups start as customer accounts and can be promoted by an admin later.
                </div>
              ) : null}
              <label>
                <span className="field-label">Your name</span>
                <input onChange={(event) => onAuthFormChange('fullName', event.target.value)} placeholder="Your name" value={authForm.fullName} />
              </label>
              {!hasShopAdmin && authForm.role === 'shop' ? (
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

function ProfileSetupScreen({ authBusy, authForm, hasShopAdmin, onChange, onSubmit, userEmail }) {
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
            <select disabled={hasShopAdmin} onChange={(event) => onChange('role', event.target.value)} value={hasShopAdmin ? 'customer' : authForm.role}>
              {roles.map((roleOption) => <option key={roleOption} value={roleOption}>{roleOption}</option>)}
            </select>
          </label>
          {hasShopAdmin ? (
            <div className="info-line">
              This project already has a shop admin. Finish setup as a customer account, then an admin can promote you if needed.
            </div>
          ) : null}
          <label>
            <span className="field-label">Your name</span>
            <input onChange={(event) => onChange('fullName', event.target.value)} placeholder="Your name" value={authForm.fullName} />
          </label>
          {!hasShopAdmin && authForm.role === 'shop' ? (
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

function TeamAdminCard({ authBusy, onPromote, onRefresh, profiles }) {
  return (
    <article className="card">
      <div className="card-toolbar">
        <div className="card-title">Team admin</div>
        <button className="button small subtle" disabled={authBusy} onClick={onRefresh}>Refresh</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Email</th><th>Name</th><th>Role</th><th>Admin</th><th /></tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr><td className="empty-cell" colSpan="5">No team accounts found yet.</td></tr>
            ) : profiles.map((teamMember) => (
              <tr key={teamMember.id}>
                <td>{teamMember.email || '-'}</td>
                <td>{teamMember.full_name || '-'}</td>
                <td>{teamMember.role}</td>
                <td>{teamMember.is_admin ? 'Yes' : 'No'}</td>
                <td>
                  <div className="row-actions">
                    <button className="button small subtle" disabled={authBusy || teamMember.role === 'shop'} onClick={() => onPromote(teamMember, { role: 'shop' })}>Make shop</button>
                    <button className="button small subtle" disabled={authBusy || teamMember.role === 'customer'} onClick={() => onPromote(teamMember, { role: 'customer', is_admin: false })}>Make customer</button>
                    <button className="button small subtle" disabled={authBusy || teamMember.is_admin} onClick={() => onPromote(teamMember, { is_admin: true, role: 'shop' })}>Make admin</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  )
}

function PortalModeToggle({ mode, onChange, shopAccount }) {
  return (
    <div className="mode-pill-group" role="tablist" aria-label="Portal mode">
      <button className={`mode-pill ${mode === 'shop' ? 'active' : ''}`} disabled={!shopAccount} onClick={() => onChange('shop')} type="button">
        Shop
      </button>
      <button className={`mode-pill ${mode === 'customer' ? 'active' : ''}`} onClick={() => onChange('customer')} type="button">
        Customer
      </button>
    </div>
  )
}

function UpgradeHint({ label }) {
  return (
    <button className="camera-button locked" title="Upgrade to Garage to unlock photo uploads." type="button">
      {label}
    </button>
  )
}

function PhotoStrip({ photos }) {
  if (!photos?.length) return null

  return (
    <div className="photo-strip">
      {photos.map((photo) => (
        <a className="photo-thumb" href={photo.dataUrl} key={photo.id} target="_blank" rel="noreferrer">
          <img alt={photo.name} src={photo.dataUrl} />
        </a>
      ))}
    </div>
  )
}

function DataLogChart({ log, selectedChannels }) {
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !log || !selectedChannels.length) return undefined

    const timeHeader = log.timeColumn
    const labels = log.rows.map((row) => Number(row[timeHeader]))
    const yAxes = {}
    const datasets = selectedChannels.map((channel, index) => {
      const axisId = `y${index}`
      yAxes[axisId] = {
        type: 'linear',
        position: index % 2 === 0 ? 'left' : 'right',
        grid: { drawOnChartArea: index === 0 },
        ticks: { color: chartColors[index] || chartColors[0] },
      }

      return {
        label: channel,
        data: log.rows.map((row) => Number(row[channel])),
        borderColor: chartColors[index] || chartColors[0],
        backgroundColor: chartColors[index] || chartColors[0],
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.22,
        yAxisID: axisId,
      }
    })

    chartRef.current?.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            labels: { color: '#f4f1ea' },
          },
          tooltip: {
            callbacks: {
              title(items) {
                return `Time ${items[0]?.label ?? '-'}s`
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: 'Time (seconds)', color: '#a9b0bd' },
            ticks: { color: '#a9b0bd' },
            grid: { color: 'rgba(255,255,255,0.06)' },
          },
          ...yAxes,
        },
      },
    })

    return () => {
      chartRef.current?.destroy()
      chartRef.current = null
    }
  }, [log, selectedChannels])

  return <canvas className="log-chart" ref={canvasRef} />
}

function App() {
  const [workspace, setWorkspace] = useState(() => cloneWorkspace(demoWorkspace))
  const [activeBuildId, setActiveBuildId] = useState(demoWorkspace.builds[0].id)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [notice, setNotice] = useState('')
  const [authState, setAuthState] = useState({ status: cloudEnabled ? 'loading' : 'demo', session: null })
  const [profile, setProfile] = useState(null)
  const [hasShopAdmin, setHasShopAdmin] = useState(false)
  const [teamProfiles, setTeamProfiles] = useState([])
  const [authMode, setAuthMode] = useState('sign-in')
  const [authBusy, setAuthBusy] = useState(false)
  const [portalMode, setPortalMode] = useState(() => window.localStorage.getItem('pitboard-portal-mode') || 'shop')
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
  const [journalDraftPhotos, setJournalDraftPhotos] = useState([])
  const [newBuild, setNewBuild] = useState({ name: '', vehicleType: 'Truck', vehicleYear: '', vehicleMake: 'Nissan', vehicleModel: 'D21 Pickup', status: 'Planning' })
  const [newPart, setNewPart] = useState({ name: '', category: 'Engine', qty: 1, unitCost: '', status: 'planned', source: 'Aftermarket', vendor: '', supplier: '', notes: '', photos: [] })
  const [newPin, setNewPin] = useState({ pin: '', function: '', type: 'Analog 0-5V', wireGauge: '', wireColor: '' })
  const [newTune, setNewTune] = useState({ version: '', name: '', status: 'Testing', power: '', torque: '', boost: '', ecuPlatform: 'Speeduino', tuneType: 'Base Map' })
  const [newLabor, setNewLabor] = useState({ date: new Date().toISOString().slice(0, 10), task: '', hours: '', rate: '' })
  const [selectedTuneId, setSelectedTuneId] = useState(null)
  const [selectedLogChannels, setSelectedLogChannels] = useState([])
  const [pendingLogImport, setPendingLogImport] = useState(null)
  const [techDrafts, setTechDrafts] = useState({ dashboard: '', parts: '', wiring: '', tunes: '', journal: '' })
  const deferredPartsQuery = useDeferredValue(partsQuery)
  const deferredPinQuery = useDeferredValue(pinQuery)

  useEffect(() => {
    let ignore = false

    async function refreshTeamProfiles(nextProfile) {
      if (!nextProfile?.is_admin) {
        setTeamProfiles([])
        return
      }

      const profiles = await listProfiles()
      if (!ignore) setTeamProfiles(profiles)
    }

    async function hydrateCloudSession(session) {
      if (!session?.user || ignore) return

      const [cloudWorkspace, nextProfile, nextHasShopAdmin] = await Promise.all([
        loadWorkspace(session.user.id),
        getProfile(session.user.id),
        getHasShopAdmin(),
      ])

      if (ignore) return

      setWorkspace(cloudWorkspace)
      setActiveBuildId(cloudWorkspace.builds[0]?.id ?? demoWorkspace.builds[0].id)
      setProfile(nextProfile)
      setHasShopAdmin(nextHasShopAdmin)
      setRole(nextProfile?.role || 'shop')
      setAuthForm((current) => ({
        ...current,
        email: session.user.email || current.email,
        fullName: nextProfile?.full_name || getAuthDisplayName(session.user) || current.fullName,
        shopName: nextProfile?.shop_name || current.shopName,
        role: nextProfile?.role || current.role,
      }))
      setAuthState({ status: nextProfile ? 'cloud' : 'setup', session })
      await refreshTeamProfiles(nextProfile)
    }

    async function boot() {
      const session = await getSession()
      if (ignore) return

      if (session) {
        await hydrateCloudSession(session)
        return
      }

      const [localWorkspace, nextHasShopAdmin] = await Promise.all([loadWorkspace(), getHasShopAdmin()])
      if (!ignore) {
        setWorkspace(localWorkspace)
        setActiveBuildId(localWorkspace.builds[0]?.id ?? demoWorkspace.builds[0].id)
        setAuthState({ status: cloudEnabled ? 'signed-out' : 'demo', session: null })
        setProfile(null)
        setHasShopAdmin(nextHasShopAdmin)
        setTeamProfiles([])
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

      const [localWorkspace, nextHasShopAdmin] = await Promise.all([loadWorkspace(), getHasShopAdmin()])
      setWorkspace(localWorkspace)
      setActiveBuildId(localWorkspace.builds[0]?.id ?? demoWorkspace.builds[0].id)
      setAuthState({ status: cloudEnabled ? 'signed-out' : 'demo', session: null })
      setProfile(null)
      setHasShopAdmin(nextHasShopAdmin)
      setTeamProfiles([])
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

  useEffect(() => {
    if (role !== 'shop' && portalMode !== 'customer') {
      setPortalMode('customer')
      return
    }
    window.localStorage.setItem('pitboard-portal-mode', portalMode)
  }, [portalMode, role])

  useEffect(() => {
    if (hasShopAdmin && !profile && authForm.role !== 'customer') {
      setAuthForm((current) => ({ ...current, role: 'customer' }))
    }
  }, [authForm.role, hasShopAdmin, profile])

  const activeBuild = useMemo(
    () => workspace.builds.find((build) => build.id === activeBuildId) ?? workspace.builds[0] ?? emptyBuild,
    [activeBuildId, workspace.builds],
  )

  const metrics = useMemo(() => getMetrics(activeBuild), [activeBuild])
  const activeShopSnapshot = activeBuild.shopSnapshot || workspace.shop
  const currentTier = activeShopSnapshot?.tier || workspace.shop.tier || 'free'
  const hasGarageTier = ['garage', 'shop'].includes(currentTier)
  const hasShopTier = currentTier === 'shop'
  const shopAccount = role === 'shop'
  const canEdit = role === 'shop' && portalMode === 'shop'
  const isShop = canEdit
  const isAdmin = Boolean(profile?.is_admin)
  const visibleTabs = role === 'shop'
    ? (portalMode === 'customer' ? customerTabs : (hasShopTier ? tabs : tabs.filter((tab) => tab !== 'labor')))
    : customerTabs
  const selectedTune = activeBuild.tunes.find((tune) => tune.id === selectedTuneId) || activeBuild.tunes[0] || null
  const selectedTuneLog = selectedTune?.dataLog || null
  const availableLogChannels = (selectedTuneLog?.headers || []).filter((header) => header !== selectedTuneLog?.timeColumn)
  const laborSpend = totalLaborCost(activeBuild.labor || [])
  const partCategoryOptions = getPartCategoryOptions(activeBuild.vehicleType || 'Truck')

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

  useEffect(() => {
    const firstTuneId = activeBuild.tunes[0]?.id || null
    setSelectedTuneId((current) => (current && activeBuild.tunes.some((tune) => tune.id === current) ? current : firstTuneId))
    setSelectedLogChannels([])
    setPendingLogImport(null)
  }, [activeBuild.id, activeBuild.tunes])

  useEffect(() => {
    if (selectedTuneLog && !selectedLogChannels.length) {
      setSelectedLogChannels(getSuggestedChannels(selectedTuneLog.headers))
    }
  }, [selectedLogChannels.length, selectedTuneLog])

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
    const nextShop = { ...workspace.shop, [field]: value }
    const nextWorkspace = {
      ...workspace,
      shop: nextShop,
      builds: workspace.builds.map((build) => ({
        ...build,
        shopSnapshot: { ...(build.shopSnapshot || {}), ...nextShop },
      })),
    }

    setWorkspace(nextWorkspace)

    if (authState.status === 'cloud' && authState.session?.user) {
      nextWorkspace.builds.forEach((build) => saveBuild(build, authState.session.user.id))
      return
    }

    saveWorkspaceLocal(nextWorkspace)
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
      phases: build.phases.map((phase) => (phase.id === phaseId ? { blockedOn: '', ...phase, [key]: value } : phase)),
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
      vehicleType: newBuild.vehicleType,
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
        { id: makeId('phase'), name: 'Scope project', owner: '', done: false, blockedOn: '' },
        { id: makeId('phase'), name: 'Plan parts', owner: '', done: false, blockedOn: '' },
        { id: makeId('phase'), name: 'Fabrication / install', owner: '', done: false, blockedOn: '' },
      ],
      parts: [],
      pins: [],
      tunes: [],
      labor: [],
      shopSnapshot: { ...workspace.shop },
      technicianNotes: getEmptyTechnicianNotes(),
      journal: [{ id: makeId('log'), at: now, text: 'Build created.', photos: [] }],
    }

    const nextWorkspace = { ...workspace, builds: [build, ...workspace.builds] }
    persistWorkspace(nextWorkspace, build.id)
    startTransition(() => {
      setActiveBuildId(build.id)
      setActiveTab('dashboard')
    })
    setNewBuild({ name: '', vehicleType: 'Truck', vehicleYear: '', vehicleMake: 'Nissan', vehicleModel: 'D21 Pickup', status: 'Planning' })
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
          category: newPart.category || getPartCategoryOptions(build.vehicleType || 'Truck')[0],
          qty: Number(newPart.qty) || 1,
          unitCost: Number(newPart.unitCost) || 0,
          status: newPart.status,
          source: newPart.source,
          vendor: newPart.vendor.trim(),
          supplier: newPart.supplier.trim(),
          notes: newPart.notes.trim(),
          photos: newPart.photos || [],
        },
        ...build.parts,
      ],
      updatedAt: new Date().toISOString(),
    }))

    setNewPart({ name: '', category: getPartCategoryOptions(activeBuild.vehicleType || 'Truck')[0], qty: 1, unitCost: '', status: 'planned', source: 'Aftermarket', vendor: '', supplier: '', notes: '', photos: [] })
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
          wireGauge: newPin.wireGauge.trim(),
          wireColor: newPin.wireColor.trim(),
          verified: false,
        },
        ...build.pins,
      ],
      updatedAt: new Date().toISOString(),
    }))

    setNewPin({ pin: '', function: '', type: 'Analog 0-5V', wireGauge: '', wireColor: '' })
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
          ecuPlatform: newTune.ecuPlatform,
          tuneType: newTune.tuneType,
          date: new Date().toISOString(),
          power: Number(newTune.power) || null,
          torque: Number(newTune.torque) || null,
          boost: Number(newTune.boost) || null,
          notes: '',
          dataLog: null,
        },
        ...build.tunes,
      ],
      updatedAt: new Date().toISOString(),
    }))

    setNewTune({ version: '', name: '', status: 'Testing', power: '', torque: '', boost: '', ecuPlatform: 'Speeduino', tuneType: 'Base Map' })
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
          ecuPlatform: 'Speeduino',
          tuneType: 'Base Map',
          date: new Date().toISOString(),
          power: null,
          torque: null,
          boost: null,
          notes: parsed.summary || 'Imported from a Speeduino / TunerStudio tune file.',
          sourceFile: file.name,
          fileSize: file.size,
          rawText: text,
          importedAt: new Date().toISOString(),
          dataLog: null,
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
      journal: [{ id: makeId('log'), at: new Date().toISOString(), text: trimmed, photos: journalDraftPhotos }, ...build.journal],
      updatedAt: new Date().toISOString(),
    }))

    setNewLog('')
    setJournalDraftPhotos([])
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

  async function handlePartPhotos(event) {
    const files = Array.from(event.target.files || [])
    const photos = await Promise.all(files.map(async (file) => ({
      id: makeId('photo'),
      name: file.name,
      dataUrl: await getFileDataUrl(file),
    })))
    setNewPart((current) => ({ ...current, photos }))
  }

  async function handleJournalPhotos(event) {
    const files = Array.from(event.target.files || [])
    const photos = await Promise.all(files.map(async (file) => ({
      id: makeId('photo'),
      name: file.name,
      dataUrl: await getFileDataUrl(file),
    })))
    setJournalDraftPhotos(photos)
  }

  function addLaborEntry(event) {
    event.preventDefault()
    if (!newLabor.task.trim()) return

    updateActiveBuild((build) => ({
      ...build,
      labor: [
        {
          id: makeId('labor'),
          date: newLabor.date || new Date().toISOString().slice(0, 10),
          task: newLabor.task.trim(),
          hours: Number(newLabor.hours) || 0,
          rate: Number(newLabor.rate) || 0,
        },
        ...(build.labor || []),
      ],
      updatedAt: new Date().toISOString(),
    }))

    setNewLabor({ date: new Date().toISOString().slice(0, 10), task: '', hours: '', rate: '' })
    setNotice('Labor entry added.')
  }

  function deleteLaborEntry(laborId) {
    updateActiveBuild((build) => ({
      ...build,
      labor: (build.labor || []).filter((entry) => entry.id !== laborId),
      updatedAt: new Date().toISOString(),
    }))
    setNotice('Labor entry deleted.')
  }

  function selectPortalMode(nextMode) {
    if (role !== 'shop' && nextMode === 'shop') return
    setPortalMode(nextMode)
    if (nextMode === 'customer' && !customerTabs.includes(activeTab)) {
      setActiveTab('dashboard')
    }
  }

  function updateSelectedLogChannel(index, value) {
    setSelectedLogChannels((current) => {
      const next = [...current]
      next[index] = value
      return next.filter(Boolean).slice(0, 4)
    })
  }

  function savePendingLogImport() {
    if (!pendingLogImport?.timeColumn) {
      setNotice('Choose the time column before saving the data log.')
      return
    }

    const parsed = parseDataLogText(pendingLogImport.text, pendingLogImport.delimiter)
    updateActiveBuild((build) => ({
      ...build,
      tunes: build.tunes.map((tune) => (tune.id === pendingLogImport.tuneId
        ? {
            ...tune,
            dataLog: {
              fileName: pendingLogImport.fileName,
              delimiter: pendingLogImport.delimiter,
              headers: parsed.headers,
              rows: parsed.rows,
              timeColumn: pendingLogImport.timeColumn,
            },
          }
        : tune)),
      updatedAt: new Date().toISOString(),
    }))

    const suggestions = getSuggestedChannels(parsed.headers)
    setSelectedTuneId(pendingLogImport.tuneId)
    setSelectedLogChannels(suggestions)
    setPendingLogImport(null)
    setNotice(`Data log attached to ${selectedTune?.name || 'tune'}.`)
  }

  async function importDataLog(event, tuneId) {
    const file = event.target.files?.[0]
    if (!file) return

    const text = await file.text()
    const detectedDelimiter = detectDelimiter(text)
    if (!detectedDelimiter) {
      setPendingLogImport({
        tuneId,
        fileName: file.name,
        text,
        delimiter: ',',
        headers: [],
        rows: [],
        timeColumn: '',
      })
      setNotice('Could not detect delimiter. Choose the separator and time column manually.')
      event.target.value = ''
      return
    }

    const parsed = parseDataLogText(text, detectedDelimiter)
    const timeColumn = detectTimeColumn(parsed.headers, parsed.rows)

    setPendingLogImport({
      tuneId,
      fileName: file.name,
      text,
      delimiter: detectedDelimiter,
      headers: parsed.headers,
      rows: parsed.rows,
      timeColumn,
    })
    setNotice(timeColumn ? 'Review the detected channels, then save the data log.' : 'Choose the time column before saving the data log.')
    event.target.value = ''
  }

  function updateAuthForm(field, value) {
    setAuthForm((current) => ({ ...current, [field]: value }))
  }

  async function persistProfile(overrides = {}) {
    const user = authState.session?.user
    if (!user) return { ok: false, message: 'No active session found.' }

    const nextRole = overrides.role || authForm.role
    const bootstrappingFirstShopAdmin = !hasShopAdmin && !profile && nextRole === 'shop'
    const currentIsAdmin = profile?.is_admin || false

    const nextProfile = {
      id: user.id,
      email: user.email || authForm.email.trim(),
      role: nextRole,
      is_admin: overrides.isAdmin ?? (bootstrappingFirstShopAdmin ? true : currentIsAdmin),
      full_name: (overrides.fullName ?? authForm.fullName).trim(),
      shop_name: (overrides.shopName ?? authForm.shopName).trim(),
    }

    const result = await upsertProfile(nextProfile)
    if (!result.ok) return result

    setProfile(nextProfile)
    setRole(nextProfile.role)
    setHasShopAdmin((current) => current || nextProfile.is_admin)
    setAuthState((current) => ({ ...current, status: 'cloud' }))
    setAuthForm((current) => ({
      ...current,
      email: nextProfile.email,
      fullName: nextProfile.full_name,
      shopName: nextProfile.shop_name,
      role: nextProfile.role,
    }))
    if (nextProfile.is_admin) {
      const profiles = await listProfiles()
      setTeamProfiles(profiles)
    }
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
        if (hasShopAdmin && authForm.role === 'shop') {
          setNotice('A shop admin already exists. Create this account as a customer, then promote it from the admin panel.')
          return
        }

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
    if (hasShopAdmin && authForm.role === 'shop' && !profile?.is_admin) {
      setNotice('This account cannot self-assign as shop. Ask a shop admin to promote it.')
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

  async function refreshTeamProfiles() {
    if (!isAdmin) return
    const profiles = await listProfiles()
    setTeamProfiles(profiles)
  }

  async function promoteProfile(teamMember, overrides) {
    if (!isAdmin) {
      setNotice('Only a shop admin can manage team accounts.')
      return
    }

    setAuthBusy(true)
    try {
      const nextProfile = {
        ...teamMember,
        ...overrides,
      }

      const result = await updateProfileByAdmin(nextProfile)
      if (!result.ok) {
        setNotice(result.message)
        return
      }

      await refreshTeamProfiles()
      setNotice(`Updated ${teamMember.email || teamMember.full_name || 'account'}.`)
    } finally {
      setAuthBusy(false)
    }
  }

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
        hasShopAdmin={hasShopAdmin}
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
        hasShopAdmin={hasShopAdmin}
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
              {activeBuild.vehicleType || 'Vehicle'} | {getVehicleLabel(activeBuild)} | {activeBuild.status} | Updated {formatDateTime(activeBuild.updatedAt)}
            </p>
          </div>
          <div className="header-actions">
            <PortalModeToggle mode={shopAccount ? portalMode : 'customer'} onChange={selectPortalMode} shopAccount={shopAccount} />
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
          {hasShopTier && isShop ? <div className="stat-item"><span>Labor cost</span><strong>{money.format(laborSpend)}</strong></div> : null}
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
        {currentTier === 'free' ? (
          <div className="ad-unit-contextual">Ad placeholder | Free tier contextual slot</div>
        ) : null}
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
                  {hasShopTier && isShop ? <div><span>Labor cost</span><strong>{money.format(laborSpend)}</strong></div> : null}
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
                    <div className="phase-detail-stack">
                      <input disabled={!isShop} onChange={(event) => updatePhase(phase.id, 'owner', event.target.value)} placeholder="Owner" value={phase.owner} />
                      <input disabled={!isShop} onChange={(event) => updatePhase(phase.id, 'blockedOn', event.target.value)} placeholder="Blocked on (optional)" value={phase.blockedOn || ''} />
                      {phase.blockedOn ? <span className="pill warn">Blocked on {phase.blockedOn}</span> : null}
                    </div>
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
                <select onChange={(event) => setNewBuild({ ...newBuild, vehicleType: event.target.value, vehicleMake: event.target.value === 'Motorcycle' ? 'Other' : newBuild.vehicleMake, vehicleModel: event.target.value === 'Motorcycle' ? 'Other' : newBuild.vehicleModel })} value={newBuild.vehicleType}>
                  {vehicleTypes.map((vehicleType) => <option key={vehicleType} value={vehicleType}>{vehicleType}</option>)}
                </select>
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
                <form className="form-grid six" onSubmit={addPart}>
                  <input onChange={(event) => setNewPart({ ...newPart, name: event.target.value })} placeholder="Part name" value={newPart.name} />
                  <select onChange={(event) => setNewPart({ ...newPart, category: event.target.value })} value={newPart.category}>
                    {partCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <select onChange={(event) => setNewPart({ ...newPart, source: event.target.value })} value={newPart.source}>
                    {partSources.map((source) => <option key={source} value={source}>{source}</option>)}
                  </select>
                  <input onChange={(event) => setNewPart({ ...newPart, vendor: event.target.value })} placeholder="Vendor / brand" value={newPart.vendor} />
                  <input onChange={(event) => setNewPart({ ...newPart, supplier: event.target.value })} placeholder="Supplier" value={newPart.supplier} />
                  <input min="1" onChange={(event) => setNewPart({ ...newPart, qty: event.target.value })} type="number" value={newPart.qty} />
                  <input min="0" onChange={(event) => setNewPart({ ...newPart, unitCost: event.target.value })} placeholder="Unit cost" step="0.01" type="number" value={newPart.unitCost} />
                  <select onChange={(event) => setNewPart({ ...newPart, status: event.target.value })} value={newPart.status}>
                    {partsStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <textarea onChange={(event) => setNewPart({ ...newPart, notes: event.target.value })} placeholder="Notes" rows="2" value={newPart.notes} />
                  {hasGarageTier ? (
                    <label className="photo-upload-field">
                      <span className="field-label">Part photos</span>
                      <input accept="image/*" multiple onChange={handlePartPhotos} type="file" />
                    </label>
                  ) : (
                    <UpgradeHint label="Camera locked" />
                  )}
                  <button className="button primary" type="submit">Add part</button>
                </form>
                <PhotoStrip photos={newPart.photos} />
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
                    <tr><th>Part</th><th>Category</th><th>Source</th><th>Vendor / Supplier</th><th>Qty</th><th>Unit</th><th>Total</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {filteredParts.length === 0 ? (
                      <tr><td className="empty-cell" colSpan="9">No parts added yet.</td></tr>
                    ) : filteredParts.map((part) => (
                      <tr key={part.id}>
                        <td><strong>{part.name}</strong><span>{part.notes || 'No part notes'}</span><PhotoStrip photos={part.photos} /></td>
                        <td>{part.category}</td>
                        <td>{part.source || '-'}</td>
                        <td>{[part.vendor, part.supplier].filter(Boolean).join(' / ') || '-'}</td>
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
                <form className="form-grid six" onSubmit={addPin}>
                  <input onChange={(event) => setNewPin({ ...newPin, pin: event.target.value })} placeholder="Pin label" value={newPin.pin} />
                  <input onChange={(event) => setNewPin({ ...newPin, function: event.target.value })} placeholder="Function" value={newPin.function} />
                  <select onChange={(event) => setNewPin({ ...newPin, type: event.target.value })} value={newPin.type}>
                    {pinTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <input onChange={(event) => setNewPin({ ...newPin, wireGauge: event.target.value })} placeholder="Wire gauge (18AWG)" value={newPin.wireGauge} />
                  <input onChange={(event) => setNewPin({ ...newPin, wireColor: event.target.value })} placeholder="Wire color" value={newPin.wireColor} />
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
                    <tr><th>Pin</th><th>Function</th><th>Type</th><th>Wire gauge</th><th>Wire color</th><th>Verified</th><th /></tr>
                  </thead>
                  <tbody>
                    {filteredPins.length === 0 ? (
                      <tr><td className="empty-cell" colSpan="7">No wiring items added yet.</td></tr>
                    ) : filteredPins.map((pin) => (
                      <tr key={pin.id}>
                        <td>{pin.pin}</td>
                        <td>{pin.function || '-'}</td>
                        <td>{pin.type || '-'}</td>
                        <td>{pin.wireGauge || '-'}</td>
                        <td>{pin.wireColor || '-'}</td>
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
                    <select onChange={(event) => setNewTune({ ...newTune, ecuPlatform: event.target.value })} value={newTune.ecuPlatform}>
                      {ecuPlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                    </select>
                    <select onChange={(event) => setNewTune({ ...newTune, tuneType: event.target.value })} value={newTune.tuneType}>
                      {tuneTypes.map((tuneType) => <option key={tuneType} value={tuneType}>{tuneType}</option>)}
                    </select>
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
                    <tr><th>Version</th><th>Name</th><th>ECU</th><th>Status / Type</th><th>Source</th><th>Log</th><th>WHP</th><th>WTQ</th><th>Boost</th><th>Date</th><th /></tr>
                  </thead>
                  <tbody>
                    {activeBuild.tunes.length === 0 ? (
                      <tr><td className="empty-cell" colSpan="11">No tune entries yet.</td></tr>
                    ) : activeBuild.tunes.map((tune) => (
                      <tr className={selectedTuneId === tune.id ? 'selected-row' : ''} key={tune.id} onClick={() => setSelectedTuneId(tune.id)}>
                        <td>{tune.version}</td>
                        <td>
                          <strong>{tune.name}</strong>
                          <span>{tune.notes || '-'}</span>
                        </td>
                        <td>{tune.ecuPlatform || 'Other'}</td>
                        <td><div className="stack-pill"><span className={`pill ${statusClass(tune.status)}`}>{tune.status}</span><span className="pill neutral">{tune.tuneType || 'Other'}</span></div></td>
                        <td>{tune.sourceFile || 'Manual entry'}</td>
                        <td>{tune.dataLog ? <span className="pill good">Log attached</span> : <span className="pill neutral">No log</span>}</td>
                        <td>{tune.power ?? '-'}</td>
                        <td>{tune.torque ?? '-'}</td>
                        <td>{tune.boost ?? '-'}</td>
                        <td>{formatDate(tune.date)}</td>
                        <td>{isShop ? <div className="row-actions">{tune.rawText ? <button className="button small subtle" onClick={(event) => { event.stopPropagation(); downloadTuneSource(tune) }}>Download</button> : null}<label className="button small subtle"><input accept=".csv,.txt" hidden onChange={(event) => importDataLog(event, tune.id)} type="file" />Attach log</label><button className="button small subtle delete-button" onClick={(event) => { event.stopPropagation(); deleteTune(tune.id) }}>Delete</button></div> : (tune.rawText ? <button className="button small subtle" onClick={() => downloadTuneSource(tune)}>Download</button> : '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            {selectedTune ? (
              <article className="card">
                <div className="card-toolbar">
                  <div className="card-title">ECU data log graphing</div>
                  <div className="info-line">{selectedTune.name} | {selectedTune.ecuPlatform || 'Other'}</div>
                </div>
                {pendingLogImport?.tuneId === selectedTune.id ? (
                  <div className="stack-form">
                    <div className="info-line">Review channels from {pendingLogImport.fileName}</div>
                    <label>
                      <span className="field-label">Delimiter</span>
                      <select onChange={(event) => setPendingLogImport((current) => ({ ...current, delimiter: event.target.value, ...parseDataLogText(current.text, event.target.value) }))} value={pendingLogImport.delimiter}>
                        <option value=",">Comma</option>
                        <option value=";">Semicolon</option>
                      </select>
                    </label>
                    <label>
                      <span className="field-label">Time column</span>
                      <select onChange={(event) => setPendingLogImport((current) => ({ ...current, timeColumn: event.target.value }))} value={pendingLogImport.timeColumn}>
                        <option value="">Select time column</option>
                        {pendingLogImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                      </select>
                    </label>
                    <div className="channel-chip-list">
                      {pendingLogImport.headers.map((header) => <span className="pill neutral" key={header}>{header}</span>)}
                    </div>
                    <div className="row-actions">
                      <button className="button primary" onClick={savePendingLogImport} type="button">Save data log</button>
                      <button className="button ghost" onClick={() => setPendingLogImport(null)} type="button">Cancel</button>
                    </div>
                  </div>
                ) : selectedTuneLog ? (
                  <div className="stack-form">
                    <div className="info-line">{selectedTuneLog.fileName} | {selectedTuneLog.rows.length} rows | {availableLogChannels.length} channels</div>
                    <div className="form-grid four">
                      {[0, 1, 2, 3].map((index) => (
                        <label key={index}>
                          <span className="field-label">Channel {index + 1}</span>
                          <select onChange={(event) => updateSelectedLogChannel(index, event.target.value)} value={selectedLogChannels[index] || ''}>
                            <option value="">None</option>
                            {availableLogChannels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                    <div className="channel-chip-list">
                      {getSuggestedChannels(selectedTuneLog.headers).map((header) => <button className="button small subtle" key={header} onClick={() => setSelectedLogChannels((current) => [...new Set([...current, header])].slice(0, 4))} type="button">{header}</button>)}
                    </div>
                    {selectedLogChannels.length ? <DataLogChart log={selectedTuneLog} selectedChannels={selectedLogChannels} /> : <div className="empty-note">Select up to four channels to graph the log.</div>}
                  </div>
                ) : (
                  <div className="stack-form">
                    <div className="info-line">No data log attached yet. Import a CSV log for this tune to visualize ECU channels over time.</div>
                    {isShop ? <label className="button subtle inline-file-button"><input accept=".csv,.txt" hidden onChange={(event) => importDataLog(event, selectedTune.id)} type="file" />Import data log</label> : null}
                  </div>
                )}
              </article>
            ) : null}

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
                  {hasGarageTier ? (
                    <label className="photo-upload-field">
                      <span className="field-label">Journal photos</span>
                      <input accept="image/*" multiple onChange={handleJournalPhotos} type="file" />
                    </label>
                  ) : (
                    <UpgradeHint label="Camera locked" />
                  )}
                  <PhotoStrip photos={journalDraftPhotos} />
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
                      <PhotoStrip photos={entry.photos} />
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

        {activeTab === 'labor' && hasShopTier && (
          <section className="page-section">
            {isShop ? (
              <article className="card">
                <div className="card-title">Add labor entry</div>
                <form className="form-grid four" onSubmit={addLaborEntry}>
                  <input onChange={(event) => setNewLabor({ ...newLabor, date: event.target.value })} type="date" value={newLabor.date} />
                  <input onChange={(event) => setNewLabor({ ...newLabor, task: event.target.value })} placeholder="Task description" value={newLabor.task} />
                  <input onChange={(event) => setNewLabor({ ...newLabor, hours: event.target.value })} placeholder="Hours" step="0.25" type="number" value={newLabor.hours} />
                  <input onChange={(event) => setNewLabor({ ...newLabor, rate: event.target.value })} placeholder="Hourly rate" step="0.01" type="number" value={newLabor.rate} />
                  <button className="button primary" type="submit">Add labor</button>
                </form>
              </article>
            ) : null}

            <article className="card">
              <div className="card-toolbar">
                <div className="card-title">Labor log</div>
                <div className="info-line">Total labor cost {money.format(laborSpend)}</div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Date</th><th>Task</th><th>Hours</th><th>Rate</th><th>Total</th><th /></tr>
                  </thead>
                  <tbody>
                    {(activeBuild.labor || []).length === 0 ? (
                      <tr><td className="empty-cell" colSpan="6">No labor entries yet.</td></tr>
                    ) : (activeBuild.labor || []).map((entry) => (
                      <tr key={entry.id}>
                        <td>{formatDate(entry.date)}</td>
                        <td>{entry.task}</td>
                        <td>{entry.hours}</td>
                        <td>{money.format(entry.rate)}</td>
                        <td>{money.format(Number(entry.hours) * Number(entry.rate))}</td>
                        <td>{isShop ? <button className="button small subtle delete-button" onClick={() => deleteLaborEntry(entry.id)}>Delete</button> : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
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
                      <div className="info-line">Role: {role}{isAdmin ? ' | shop admin' : ''}</div>
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
                    <label><span className="field-label">Tier</span><select onChange={(event) => updateShopField('tier', event.target.value)} value={workspace.shop.tier || 'free'}>{tiers.map((tier) => <option key={tier} value={tier}>{tier}</option>)}</select></label>
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

            {isAdmin ? (
              <TeamAdminCard
                authBusy={authBusy}
                onPromote={promoteProfile}
                onRefresh={refreshTeamProfiles}
                profiles={teamProfiles}
              />
            ) : null}

            {isShop ? (
              <article className="card">
                <div className="card-title">Active build details</div>
                <div className="form-grid two">
                  <label><span className="field-label">Build name</span><input onChange={(event) => updateBuildField('name', event.target.value)} value={activeBuild.name} /></label>
                  <label><span className="field-label">Vehicle type</span><select onChange={(event) => updateBuildField('vehicleType', event.target.value)} value={activeBuild.vehicleType || 'Truck'}>{vehicleTypes.map((vehicleType) => <option key={vehicleType} value={vehicleType}>{vehicleType}</option>)}</select></label>
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
