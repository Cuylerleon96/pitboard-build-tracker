import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import './App.css'
import { demoWorkspace } from './data/demoWorkspace'
import {
  cloudEnabled,
  createCheckoutSession,
  deleteBuildFromCloud,
  getProfile,
  getHasShopAdmin,
  getSession,
  listProfiles,
  loadWorkspace,
  openBillingPortal,
  saveBuild,
  queueSave,
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
const tabs = ['dashboard', 'builds', 'tasks', 'parts', 'wiring', 'tunes', 'labor', 'journal', 'settings']
const customerTabs = ['dashboard', 'parts', 'wiring', 'tunes', 'journal', 'settings']
const taskStatuses = ['open', 'in_progress', 'done']
const roles = ['shop', 'customer']
const tiers = ['free', 'garage', 'shop']
const vehicleTypes = ['Car', 'Truck', 'Motorcycle', 'UTV', 'Boat']
const years = Array.from({ length: 48 }, (_, index) => String(new Date().getFullYear() + 1 - index))
const makesByVehicleType = {
  Car: ['Nissan', 'Ford', 'Chevrolet', 'Toyota', 'Honda', 'Dodge', 'Jeep', 'BMW', 'Mercedes-Benz', 'Subaru', 'Mazda', 'Mitsubishi', 'Other'],
  Truck: ['Nissan', 'Ford', 'Chevrolet', 'Toyota', 'Honda', 'Dodge', 'Ram', 'GMC', 'Other'],
  Motorcycle: ['Yamaha', 'Honda', 'Kawasaki', 'Suzuki', 'Ducati', 'Harley-Davidson', 'BMW', 'KTM', 'Royal Enfield', 'Triumph', 'Other'],
  UTV: ['Polaris', 'Can-Am', 'Yamaha', 'Honda', 'Kawasaki', 'Arctic Cat', 'Textron', 'Other'],
  Boat: ['Yamaha', 'Mercury', 'MerCruiser', 'Volvo Penta', 'Evinrude', 'Boston Whaler', 'Sea Ray', 'Other'],
}
const modelsByMake = {
  // Cars / Trucks
  Nissan: ['D21 Pickup', '240SX', '300ZX', '350Z', '370Z', 'Frontier', 'Pathfinder', 'Hardbody', 'Other'],
  Ford: ['Mustang', 'F-150', 'F-250', 'Ranger', 'Bronco', 'Focus', 'Fusion', 'Other'],
  Chevrolet: ['C10', 'C/K 1500', 'Silverado', 'Camaro', 'Corvette', 'S10', 'Blazer', 'Other'],
  Toyota: ['Tacoma', 'Hilux', 'Tundra', 'Supra', '4Runner', 'Corolla', 'Celica', 'Other'],
  Honda: ['Civic', 'Accord', 'S2000', 'CR-V', 'Ridgeline', 'CBR600RR', 'CBR1000RR', 'CB750', 'CB500F', 'CRF450', 'Other'],
  Dodge: ['Ram 1500', 'Ram 2500', 'Charger', 'Challenger', 'Dakota', 'Viper', 'Other'],
  Jeep: ['Cherokee', 'Grand Cherokee', 'Wrangler', 'Comanche', 'Gladiator', 'Other'],
  BMW: ['E30', 'E36', 'E46', 'E90', 'M3', 'M5', 'S1000RR', 'R1250GS', 'F800GS', 'Other'],
  'Mercedes-Benz': ['190E', 'C-Class', 'E-Class', 'SL', 'Other'],
  Subaru: ['Impreza', 'WRX', 'WRX STI', 'BRZ', 'Forester', 'Legacy', 'Other'],
  Mazda: ['MX-5 Miata', 'RX-7', 'RX-8', 'Mazdaspeed3', 'Other'],
  Mitsubishi: ['Lancer Evo', 'Eclipse', '3000GT', 'Galant VR-4', 'Other'],
  Ram: ['1500', '2500', '3500', 'Other'],
  GMC: ['Sierra 1500', 'Sierra 2500', 'Canyon', 'Jimmy', 'Other'],
  // Motorcycles
  Yamaha: ['YZF-R1', 'YZF-R6', 'MT-07', 'MT-09', 'FZ1', 'FZ-09', 'V-Star 650', 'YZ450F', 'WR450F', 'Other'],
  Kawasaki: ['ZX-6R', 'ZX-10R', 'Ninja 400', 'Ninja 650', 'Z900', 'Z650', 'Vulcan 900', 'KX450', 'Other'],
  Suzuki: ['GSX-R600', 'GSX-R750', 'GSX-R1000', 'SV650', 'DR-Z400', 'Hayabusa', 'Other'],
  Ducati: ['Monster 821', 'Monster 1200', 'Panigale V4', '916', '998', 'Streetfighter V4', 'Other'],
  'Harley-Davidson': ['Sportster 883', 'Sportster 1200', 'Dyna Street Bob', 'Softail', 'Road King', 'Street Glide', 'Other'],
  KTM: ['390 Duke', '690 Duke', '1290 Super Duke R', 'RC 390', '450 EXC-F', '500 EXC-F', 'Other'],
  'Royal Enfield': ['Bullet 500', 'Continental GT 650', 'Interceptor 650', 'Himalayan', 'Meteor 350', 'Other'],
  Triumph: ['Bonneville T120', 'Street Triple R', 'Tiger 900', 'Speed Triple 1200', 'Thruxton', 'Other'],
  // UTVs
  Polaris: ['RZR XP 1000', 'RZR Pro XP', 'RZR XP Turbo', 'Ranger 1000', 'General 1000', 'Other'],
  'Can-Am': ['Maverick X3', 'Maverick Sport', 'Defender HD10', 'Commander XT', 'Other'],
  'Arctic Cat': ['Wildcat XX', 'Alterra 700', 'Alterra 1000', 'Other'],
  Textron: ['Havoc X', 'Stampede 900', 'Wildcat XX', 'Other'],
  // Boats
  Mercury: ['60hp', '115hp', '150hp', '200hp', '250hp', '300hp', 'Other'],
  MerCruiser: ['4.3L V6', '5.0L V8', '6.2L V8', 'Other'],
  'Volvo Penta': ['D3', 'D4', 'D6', 'IPS Drive', 'Other'],
  Evinrude: ['90hp E-TEC', '115hp E-TEC', '150hp E-TEC', '200hp E-TEC', 'Other'],
  'Boston Whaler': ['130 Super Sport', '170 Montauk', '210 Montauk', '270 Dauntless', 'Other'],
  'Sea Ray': ['SPX 190', 'SPX 210', 'SLX 280', 'Sundancer 350', 'Other'],
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

function makeId(_prefix) {
  return crypto.randomUUID()
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
  if (['installed', 'active', 'approved', 'done'].includes(String(status).toLowerCase())) return 'good'
  if (['blocked', 'on hold'].includes(String(status).toLowerCase())) return 'bad'
  if (['quoted', 'ordered', 'received', 'testing', 'in_progress'].includes(String(status).toLowerCase())) return 'warn'
  return 'neutral'
}

function getVehicleLabel(build) {
  if (build.vehicleYear || build.vehicleMake || build.vehicleModel) {
    return [build.vehicleYear, build.vehicleMake, build.vehicleModel].filter(Boolean).join(' ') || 'Year Make Model'
  }
  return build.vehicle || 'Year Make Model'
}

function getMakeOptions(vehicleType) {
  return makesByVehicleType[vehicleType] || makesByVehicleType.Car
}

function getModelOptions(make) {
  return modelsByMake[make] || ['Custom', 'Other']
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

/* ── Custom Select — replaces native <AppSelect> so the popup is always dark ── */
function AppSelect({ value, onChange, disabled, className, style, onClick, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Parse <option> children into {value, label, disabled} objects
  const options = []
  ;(Array.isArray(children) ? children.flat() : [children]).forEach((child) => {
    if (!child || child.type !== 'option') return
    options.push({
      value: child.props.value !== undefined ? child.props.value : child.props.children,
      label: child.props.children,
      disabled: child.props.disabled || false,
    })
  })

  const selectedLabel = options.find((o) => String(o.value) === String(value ?? ''))?.label ?? value ?? ''

  useEffect(() => {
    if (!open) return
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function handleTrigger(e) {
    if (onClick) onClick(e)
    if (!disabled) setOpen((v) => !v)
  }

  function handlePick(opt, e) {
    e.stopPropagation()
    if (opt.disabled) return
    onChange({ target: { value: opt.value } })
    setOpen(false)
  }

  return (
    <div
      ref={ref}
      className={`app-select${disabled ? ' app-select--disabled' : ''}${open ? ' app-select--open' : ''}${className ? ' ' + className : ''}`}
      style={style}
    >
      <div className="app-select-trigger" onMouseDown={handleTrigger}>
        <span className="app-select-value">{selectedLabel}</span>
        <span className="app-select-arrow">{open ? '▴' : '▾'}</span>
      </div>
      {open && (
        <div className="app-select-menu">
          {options.map((opt, i) => (
            <div
              key={i}
              className={`app-select-option${String(opt.value) === String(value ?? '') ? ' app-select-option--selected' : ''}${opt.disabled ? ' app-select-option--disabled' : ''}`}
              onMouseDown={(e) => handlePick(opt, e)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Wiring diagram colour helper ───────────────────────── */
function wireColorToHex(name) {
  if (!name) return 'rgba(249,115,22,0.65)'
  const n = name.toLowerCase().trim()
  const map = {
    red: '#e05252', black: '#9e9e9e', white: '#e0e0e0', yellow: '#f2c078',
    green: '#52d08d', blue: '#6aa7ff', orange: '#f97316', purple: '#b48fdd',
    pink: '#f48fb1', gray: '#9e9e9e', grey: '#9e9e9e', brown: '#a1887f',
    blk: '#9e9e9e', wht: '#e0e0e0', grn: '#52d08d', blu: '#6aa7ff',
    ylw: '#f2c078', org: '#f97316', vio: '#b48fdd',
  }
  for (const [k, v] of Object.entries(map)) {
    if (n.includes(k)) return v
  }
  return 'rgba(249,115,22,0.65)'
}

function WiringDiagram({ connectors, pins }) {
  const hasWires = pins.some((p) => p.fromConnectorId || p.toConnectorId)
  if (!connectors.length || !hasWires) return null

  const MARGIN = 36
  const CONN_W = 140
  const CONN_H = 40
  const ROW_H = 72
  const MID_GAP = 180

  // Split connectors into left / right columns
  const half = Math.ceil(connectors.length / 2)
  const leftConns = connectors.slice(0, half)
  const rightConns = connectors.slice(half)

  const rows = Math.max(leftConns.length, rightConns.length)
  const SVG_W = MARGIN * 2 + CONN_W * 2 + MID_GAP
  const SVG_H = MARGIN * 2 + rows * ROW_H + CONN_H / 2

  const positions = {}
  leftConns.forEach((c, i) => {
    positions[c.id] = { cx: MARGIN + CONN_W / 2, cy: MARGIN + i * ROW_H + CONN_H / 2, side: 'left' }
  })
  rightConns.forEach((c, i) => {
    positions[c.id] = { cx: MARGIN + CONN_W + MID_GAP + CONN_W / 2, cy: MARGIN + i * ROW_H + CONN_H / 2, side: 'right' }
  })

  // Count wires per pair for offset spacing
  const pairCounts = {}
  const pairIdxs = {}
  pins.forEach((p) => {
    if (!p.fromConnectorId && !p.toConnectorId) return
    const key = [p.fromConnectorId || '_', p.toConnectorId || '_'].sort().join('|')
    pairCounts[key] = (pairCounts[key] || 0) + 1
  })
  pins.forEach((p) => {
    if (!p.fromConnectorId && !p.toConnectorId) return
    const key = [p.fromConnectorId || '_', p.toConnectorId || '_'].sort().join('|')
    pairIdxs[p.id] = (pairIdxs[p.id] !== undefined ? pairIdxs[p.id] : (pairIdxs['__next__' + key] || 0))
    pairIdxs['__next__' + key] = pairIdxs[p.id] + 1
  })

  function buildPath(pin, wireIdx) {
    const fp = positions[pin.fromConnectorId]
    const tp = positions[pin.toConnectorId]
    if (!fp && !tp) return null
    // If only one end is connected, skip
    if (!fp || !tp) return null

    const total = pairCounts[[pin.fromConnectorId || '_', pin.toConnectorId || '_'].sort().join('|')] || 1
    const yOff = (wireIdx - (total - 1) / 2) * 8

    let sx, sy, tx, ty, c1x, c1y, c2x, c2y

    const sameSide = fp.side === tp.side
    if (!sameSide) {
      sx = fp.side === 'left' ? fp.cx + CONN_W / 2 : fp.cx - CONN_W / 2
      tx = tp.side === 'right' ? tp.cx - CONN_W / 2 : tp.cx + CONN_W / 2
      sy = fp.cy + yOff
      ty = tp.cy + yOff
      const midX = (sx + tx) / 2
      c1x = midX; c1y = sy
      c2x = midX; c2y = ty
    } else if (fp.side === 'left') {
      sx = fp.cx - CONN_W / 2; sy = fp.cy + yOff
      tx = tp.cx - CONN_W / 2; ty = tp.cy + yOff
      const loopX = Math.min(sx, tx) - 50
      c1x = loopX; c1y = sy
      c2x = loopX; c2y = ty
    } else {
      sx = fp.cx + CONN_W / 2; sy = fp.cy + yOff
      tx = tp.cx + CONN_W / 2; ty = tp.cy + yOff
      const loopX = Math.max(sx, tx) + 50
      c1x = loopX; c1y = sy
      c2x = loopX; c2y = ty
    }

    return { sx, sy, tx, ty, c1x, c1y, c2x, c2y }
  }

  return (
    <article className="card" style={{ overflow: 'hidden' }}>
      <div className="card-title">Wiring diagram</div>
      <div style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width={SVG_W}
          height={SVG_H}
          style={{ display: 'block', minWidth: SVG_W, fontFamily: 'var(--mono)' }}
        >
          {/* Wire paths — draw under connectors */}
          {pins.map((pin) => {
            const path = buildPath(pin, pairIdxs[pin.id] || 0)
            if (!path) return null
            const { sx, sy, tx, ty, c1x, c1y, c2x, c2y } = path
            const midX = (sx + tx) / 2 + (c1x - (sx + tx) / 2) * 0.4
            const midY = (sy + ty) / 2
            const stroke = wireColorToHex(pin.wireColor)
            return (
              <g key={pin.id}>
                <path
                  d={`M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`}
                  stroke={stroke}
                  strokeWidth={1.8}
                  fill="none"
                  opacity={0.75}
                  strokeLinecap="round"
                />
                {/* Arrow at destination */}
                <circle cx={tx} cy={ty} r={2.5} fill={stroke} opacity={0.9} />
                {/* Signal label */}
                {pin.function && (
                  <text
                    x={midX}
                    y={midY - 5}
                    textAnchor="middle"
                    fontSize={9}
                    fill="rgba(244,241,234,0.45)"
                  >
                    {pin.function.length > 14 ? pin.function.slice(0, 14) + '…' : pin.function}
                  </text>
                )}
                {/* Gauge label */}
                {pin.wireGauge && (
                  <text
                    x={midX}
                    y={midY + 5}
                    textAnchor="middle"
                    fontSize={8}
                    fill="rgba(244,241,234,0.3)"
                  >
                    {pin.wireGauge}
                  </text>
                )}
              </g>
            )
          })}

          {/* Connector boxes — draw on top */}
          {connectors.map((c) => {
            const pos = positions[c.id]
            if (!pos) return null
            const wireCount = pins.filter((p) => p.fromConnectorId === c.id || p.toConnectorId === c.id).length
            const label = c.name.length > 16 ? c.name.slice(0, 15) + '…' : c.name
            return (
              <g key={c.id}>
                <rect
                  x={pos.cx - CONN_W / 2}
                  y={pos.cy - CONN_H / 2}
                  width={CONN_W}
                  height={CONN_H}
                  rx={8}
                  fill="#0f1117"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth={1.2}
                />
                {wireCount > 0 && (
                  <rect
                    x={pos.cx - CONN_W / 2}
                    y={pos.cy - CONN_H / 2}
                    width={CONN_W}
                    height={4}
                    rx={3}
                    fill="rgba(249,115,22,0.5)"
                  />
                )}
                <text
                  x={pos.cx}
                  y={pos.cy + 5}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="#f4f1ea"
                >
                  {label}
                </text>
                <text
                  x={pos.cx}
                  y={pos.cy + CONN_H / 2 + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(249,115,22,0.7)"
                >
                  {wireCount} wire{wireCount !== 1 ? 's' : ''}
                </text>
              </g>
            )
          })}
        </svg>
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
                <AppSelect disabled={hasShopAdmin} onChange={(event) => onAuthFormChange('role', event.target.value)} value={hasShopAdmin ? 'customer' : authForm.role}>
                  {roles.map((roleOption) => <option key={roleOption} value={roleOption}>{roleOption}</option>)}
                </AppSelect>
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
  // If a shop admin already exists but THIS user has no profile, they may be the
  // original owner signing in on a new session. Allow them to reclaim the shop role.
  const lockedOut = hasShopAdmin && authForm.role !== 'shop'
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
            <AppSelect onChange={(event) => onChange('role', event.target.value)} value={authForm.role}>
              {roles.map((roleOption) => <option key={roleOption} value={roleOption}>{roleOption}</option>)}
            </AppSelect>
          </label>
          {hasShopAdmin && authForm.role !== 'shop' ? (
            <div className="info-line">
              A shop admin account already exists. If you are the shop owner, switch the type above to <strong>shop</strong>. Otherwise finish as a customer and an admin can promote you.
            </div>
          ) : null}
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
            <tr><th>Email</th><th>Name</th><th>Role</th><th>Admin</th><th>Tier</th><th /></tr>
          </thead>
          <tbody>
            {profiles.length === 0 ? (
              <tr><td className="empty-cell" colSpan="6">No team accounts found yet.</td></tr>
            ) : profiles.map((teamMember) => (
              <tr key={teamMember.id}>
                <td>{teamMember.email || '-'}</td>
                <td>{teamMember.full_name || '-'}</td>
                <td>{teamMember.role}</td>
                <td>{teamMember.is_admin ? 'Yes' : 'No'}</td>
                <td>
                  <AppSelect
                    disabled={authBusy}
                    value={teamMember.tier || 'free'}
                    onChange={(e) => onPromote(teamMember, { tier: e.target.value })}
                  >
                    <option value="free">free</option>
                    <option value="garage">garage</option>
                    <option value="shop">shop</option>
                  </AppSelect>
                </td>
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

const TIER_FEATURES = {
  free: ['Unlimited builds', 'Parts & wiring tracker', 'Tune log import', 'Customer portal', 'Ads shown in app'],
  garage: ['Everything in Free', 'No ads', 'Labor & cost tracking'],
  shop: ['Everything in Garage', 'Full team management', 'Multi-technician labor logs'],
}

const TIER_LABELS = { free: 'Free', garage: 'Garage', shop: 'Shop' }

function BillingCard({ billingBusy, currentTier, onManage, onUpgrade }) {
  return (
    <article className="card">
      <div className="card-title">Plan &amp; billing</div>
      <div className="section-grid three billing-tiers">
        {['free', 'garage', 'shop'].map((tier) => {
          const isActive = currentTier === tier
          return (
            <div key={tier} className={`billing-tier-card${isActive ? ' active' : ''}`}>
              <div className="billing-tier-name">{TIER_LABELS[tier]}{isActive ? <span className="billing-current-badge">current</span> : null}</div>
              <ul className="billing-feature-list">
                {TIER_FEATURES[tier].map((f) => <li key={f}>{f}</li>)}
              </ul>
              {tier === 'free' ? null : isActive ? (
                <button className="button small subtle" disabled={billingBusy} onClick={onManage}>Manage billing</button>
              ) : (
                <button
                  className="button small primary"
                  disabled={billingBusy || (currentTier === 'shop' && tier === 'garage')}
                  onClick={() => onUpgrade(tier)}
                >
                  {currentTier === 'shop' && tier === 'garage' ? 'Downgrade in portal' : `Upgrade to ${TIER_LABELS[tier]}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
      {currentTier !== 'free' ? (
        <div className="settings-copy" style={{ marginTop: '0.75rem' }}>
          <button className="button ghost small" disabled={billingBusy} onClick={onManage}>Manage subscription / invoices</button>
        </div>
      ) : null}
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
  const [editingPartId, setEditingPartId] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [newTask, setNewTask] = useState({ title: '', partId: '', deadline: '', details: '', photos: [] })
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [taskNoteDrafts, setTaskNoteDrafts] = useState({})
  const [pinQuery, setPinQuery] = useState('')
  const [newLog, setNewLog] = useState('')
  const [journalDraftPhotos, setJournalDraftPhotos] = useState([])
  const [newBuild, setNewBuild] = useState({ name: '', vehicleType: 'Truck', vehicleYear: '', vehicleMake: getMakeOptions('Truck')[0], vehicleModel: getModelOptions(getMakeOptions('Truck')[0])[0], status: 'Planning' })
  const [newPart, setNewPart] = useState({ name: '', category: 'Engine', qty: 1, unitCost: '', status: 'planned', source: 'Aftermarket', vendor: '', supplier: '', notes: '', photos: [] })
  const [newPin, setNewPin] = useState({ fromConnectorId: '', fromPin: '', toConnectorId: '', toPin: '', function: '', type: 'Analog 0-5V', wireGauge: '', wireColor: '' })
  const [newConnector, setNewConnector] = useState({ name: '', description: '' })
  const [collapsedConnectors, setCollapsedConnectors] = useState({})
  const [newTune, setNewTune] = useState({ version: '', name: '', status: 'Testing', power: '', torque: '', boost: '', ecuPlatform: 'Speeduino', tuneType: 'Base Map' })
  const [newLabor, setNewLabor] = useState({ date: new Date().toISOString().slice(0, 10), task: '', hours: '', rate: '' })
  const [selectedTuneId, setSelectedTuneId] = useState(null)
  const [selectedLogChannels, setSelectedLogChannels] = useState([])
  const [pendingLogImport, setPendingLogImport] = useState(null)
  const [techDrafts, setTechDrafts] = useState({ dashboard: '', parts: '', wiring: '', tunes: '', journal: '' })
  const [billingBusy, setBillingBusy] = useState(false)
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

    function fallbackToSignedOut() {
      if (ignore) return
      setAuthState({ status: cloudEnabled ? 'signed-out' : 'demo', session: null })
      setProfile(null)
      setHasShopAdmin(false)
      setTeamProfiles([])
      setRole('shop')
    }

    async function hydrateCloudSession(session) {
      if (!session?.user || ignore) return

      try {
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
      } catch {
        fallbackToSignedOut()
      }
    }

    async function boot() {
      try {
        const timeout = new Promise((_, reject) =>
          window.setTimeout(() => reject(new Error('session timeout')), 6000),
        )
        const session = await Promise.race([getSession(), timeout])
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
      } catch {
        fallbackToSignedOut()
      }
    }

    boot().then(() => {
      // Handle return from Stripe Checkout
      const params = new URLSearchParams(window.location.search)
      const billingResult = params.get('billing')
      if (billingResult === 'success') {
        const tier = params.get('tier') || 'paid'
        setNotice(`You're now on the ${tier} plan. Welcome aboard!`)
        setActiveTab('settings')
        window.history.replaceState({}, '', window.location.pathname)
      } else if (billingResult === 'cancelled') {
        setNotice('Checkout was cancelled — your plan was not changed.')
        window.history.replaceState({}, '', window.location.pathname)
      }
    })

    const subscription = subscribeToAuth(async (event, session) => {
      try {
        // TOKEN_REFRESHED just means Supabase silently renewed the access token — no need
        // to re-hydrate or show a notice. Ignoring it also prevents a race where a refresh
        // fires just after sign-out and undoes the signed-out state.
        if (event === 'TOKEN_REFRESHED') return

        if (session?.user) {
          await hydrateCloudSession(session)
          // Only show the notice on an actual new sign-in, not on the initial page load
          if (event === 'SIGNED_IN') setNotice('Cloud session connected.')
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
      } catch {
        // subscription error — leave state as-is
      }
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

  // (removed: old effect that forced customer role when shop admin existed —
  //  this blocked the owner from reclaiming their admin account on a fresh session)

  const activeBuild = useMemo(
    () => workspace.builds.find((build) => build.id === activeBuildId) ?? workspace.builds[0] ?? emptyBuild,
    [activeBuildId, workspace.builds],
  )

  const metrics = useMemo(() => getMetrics(activeBuild), [activeBuild])
  const activeShopSnapshot = activeBuild.shopSnapshot || workspace.shop
  // Tier is authoritative from the server-side profile; fall back to 'free' for demo/guest mode
  const currentTier = profile?.tier || 'free'
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
      const haystack = [pin.fromPin, pin.toPin, pin.function, pin.type, pin.wireColor].join(' ').toLowerCase()
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
      if (targetBuild) queueSave(targetBuild, authState.session.user.id)
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
      nextWorkspace.builds.forEach((build) => queueSave(build, authState.session.user.id))
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

    if (authState.status === 'cloud' && authState.session?.user) {
      deleteBuildFromCloud(buildId, authState.session.user.id)
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
    setNewBuild({ name: '', vehicleType: 'Truck', vehicleYear: '', vehicleMake: getMakeOptions('Truck')[0], vehicleModel: getModelOptions(getMakeOptions('Truck')[0])[0], status: 'Planning' })
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

  function startEditPart(part) {
    setEditingPartId(part.id)
    setEditDraft({ ...part })
  }

  function cancelEditPart() {
    setEditingPartId(null)
    setEditDraft(null)
  }

  function saveEditPart() {
    if (!editDraft) return
    updateActiveBuild((build) => ({
      ...build,
      parts: build.parts.map((p) =>
        p.id === editDraft.id
          ? {
              ...p,
              name: editDraft.name.trim(),
              notes: (editDraft.notes || '').trim(),
              category: editDraft.category,
              source: editDraft.source,
              vendor: (editDraft.vendor || '').trim(),
              supplier: (editDraft.supplier || '').trim(),
              qty: Number(editDraft.qty) || 1,
              unitCost: Number(editDraft.unitCost) || 0,
              status: editDraft.status,
            }
          : p,
      ),
      updatedAt: new Date().toISOString(),
    }))
    setEditingPartId(null)
    setEditDraft(null)
    setNotice('Part updated.')
  }

  function addTask(event) {
    event.preventDefault()
    if (!newTask.title.trim()) return
    const taskId = makeId('task')
    updateActiveBuild((build) => ({
      ...build,
      tasks: [
        {
          id: taskId,
          title: newTask.title.trim(),
          partId: newTask.partId || null,
          deadline: newTask.deadline,
          details: newTask.details.trim(),
          notes: '',
          photos: newTask.photos || [],
          status: 'open',
          createdAt: new Date().toISOString(),
        },
        ...(build.tasks || []),
      ],
      updatedAt: new Date().toISOString(),
    }))
    setNewTask({ title: '', partId: '', deadline: '', details: '', photos: [] })
    setExpandedTaskId(taskId)
    setNotice('Task added.')
  }

  function deleteTask(taskId) {
    updateActiveBuild((build) => ({
      ...build,
      tasks: (build.tasks || []).filter((t) => t.id !== taskId),
      updatedAt: new Date().toISOString(),
    }))
    if (expandedTaskId === taskId) setExpandedTaskId(null)
    setNotice('Task deleted.')
  }

  function cycleTaskStatus(taskId) {
    updateActiveBuild((build) => ({
      ...build,
      tasks: (build.tasks || []).map((t) => {
        if (t.id !== taskId) return t
        const index = taskStatuses.indexOf(t.status)
        return { ...t, status: taskStatuses[(index + 1) % taskStatuses.length] }
      }),
      updatedAt: new Date().toISOString(),
    }))
  }

  function commitTaskNotes(taskId) {
    const draft = taskNoteDrafts[taskId]
    if (draft === undefined) return
    updateActiveBuild((build) => ({
      ...build,
      tasks: (build.tasks || []).map((t) => t.id === taskId ? { ...t, notes: draft } : t),
      updatedAt: new Date().toISOString(),
    }))
  }

  async function handleTaskPhotos(event) {
    const files = Array.from(event.target.files || [])
    const photos = await Promise.all(files.map(async (file) => ({
      id: makeId('photo'),
      name: file.name,
      dataUrl: await getFileDataUrl(file),
    })))
    setNewTask((current) => ({ ...current, photos }))
  }

  async function addTaskPhoto(taskId, event) {
    const files = Array.from(event.target.files || [])
    if (!files.length) return
    const newPhotos = await Promise.all(files.map(async (file) => ({
      id: makeId('photo'),
      name: file.name,
      dataUrl: await getFileDataUrl(file),
    })))
    updateActiveBuild((build) => ({
      ...build,
      tasks: (build.tasks || []).map((t) =>
        t.id === taskId ? { ...t, photos: [...(t.photos || []), ...newPhotos] } : t,
      ),
      updatedAt: new Date().toISOString(),
    }))
  }

  function addPin(event) {
    event.preventDefault()
    if (!newPin.fromPin.trim() && !newPin.toPin.trim()) return

    updateActiveBuild((build) => ({
      ...build,
      pins: [
        {
          id: makeId('pin'),
          fromConnectorId: newPin.fromConnectorId || null,
          fromPin: newPin.fromPin.trim(),
          toConnectorId: newPin.toConnectorId || null,
          toPin: newPin.toPin.trim(),
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

    setNewPin({ fromConnectorId: newPin.fromConnectorId, fromPin: '', toConnectorId: newPin.toConnectorId, toPin: '', function: '', type: 'Analog 0-5V', wireGauge: '', wireColor: '' })
    setNotice('Wire added.')
  }

  function deletePin(pinId) {
    updateActiveBuild((build) => ({
      ...build,
      pins: build.pins.filter((pin) => pin.id !== pinId),
      updatedAt: new Date().toISOString(),
    }))
    setNotice('Pin deleted.')
  }

  function addConnector(event) {
    event.preventDefault()
    if (!newConnector.name.trim()) return
    updateActiveBuild((build) => ({
      ...build,
      connectors: [
        ...(build.connectors || []),
        { id: makeId('connector'), name: newConnector.name.trim(), description: newConnector.description.trim() },
      ],
      updatedAt: new Date().toISOString(),
    }))
    setNewConnector({ name: '', description: '' })
    setNotice('Connector added.')
  }

  function deleteConnector(connectorId) {
    updateActiveBuild((build) => ({
      ...build,
      connectors: (build.connectors || []).filter((c) => c.id !== connectorId),
      // unassign any wires that referenced this connector on either end
      pins: build.pins.map((pin) => ({
        ...pin,
        fromConnectorId: pin.fromConnectorId === connectorId ? null : pin.fromConnectorId,
        toConnectorId: pin.toConnectorId === connectorId ? null : pin.toConnectorId,
      })),
      updatedAt: new Date().toISOString(),
    }))
    setNotice('Connector removed.')
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
    // Grant admin when: (a) no shop admin exists yet and this is a shop setup, or
    // (b) user has no profile at all and is claiming shop — covers the orphaned-admin
    //     recovery case where a valid owner signs in on a fresh session.
    const claimingShop = nextRole === 'shop' && !profile
    const currentIsAdmin = profile?.is_admin || false

    const nextProfile = {
      id: user.id,
      email: user.email || authForm.email.trim(),
      role: nextRole,
      is_admin: overrides.isAdmin ?? (claimingShop ? true : currentIsAdmin),
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
    // Allow shop role claim from setup screen — is_admin logic in persistProfile handles it

    setAuthBusy(true)
    try {
      const result = await persistProfile()
      setNotice(result.ok ? 'Account setup saved.' : result.message)
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch {
      // signOut clears the local session regardless; continue resetting state
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
    setPortalMode('shop')
    window.localStorage.setItem('pitboard-portal-mode', 'shop')
  }

  async function refreshTeamProfiles() {
    if (!isAdmin) return
    const profiles = await listProfiles()
    setTeamProfiles(profiles)
  }

  async function handleUpgrade(tier) {
    setBillingBusy(true)
    setNotice('Redirecting to checkout…')
    try {
      const result = await createCheckoutSession(tier)
      if (!result.ok) setNotice(result.message)
    } catch {
      setNotice('Could not start checkout. Please try again.')
    } finally {
      setBillingBusy(false)
    }
  }

  async function handleManageBilling() {
    setBillingBusy(true)
    setNotice('Opening billing portal…')
    try {
      const result = await openBillingPortal()
      if (!result.ok) setNotice(result.message)
    } catch {
      setNotice('Could not open billing portal. Please try again.')
    } finally {
      setBillingBusy(false)
    }
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

            {/* ── Task board ── primary hero section */}
            <article className="card">
              <div className="card-toolbar">
                <div className="card-title">Task board</div>
                {isShop && (
                  <button className="button small subtle" onClick={() => startTransition(() => setActiveTab('tasks'))}>
                    + Add task
                  </button>
                )}
              </div>
              {(activeBuild.tasks || []).filter((t) => t.status !== 'done').length === 0 ? (
                <p className="empty-note">No open tasks. {isShop ? 'Go to the Tasks tab to add one.' : ''}</p>
              ) : (
                <div className="dashboard-task-board">
                  {/* In progress column */}
                  <div className="dashboard-task-col">
                    <div className="dashboard-task-col-label">In progress</div>
                    {(activeBuild.tasks || []).filter((t) => t.status === 'in_progress').length === 0
                      ? <p className="empty-note" style={{ fontSize: '0.82rem' }}>None</p>
                      : (activeBuild.tasks || []).filter((t) => t.status === 'in_progress').map((task) => {
                          const linkedPart = activeBuild.parts.find((p) => p.id === task.partId)
                          return (
                            <div key={task.id} className="dashboard-task-chip task-status-in_progress" onClick={() => { startTransition(() => setActiveTab('tasks')); setExpandedTaskId(task.id) }}>
                              <strong>{task.title}</strong>
                              {linkedPart && <span>🔗 {linkedPart.name}</span>}
                              {task.deadline && <span>📅 {formatDate(task.deadline)}</span>}
                              {task.notes && <span className="dashboard-task-note">{task.notes}</span>}
                            </div>
                          )
                        })
                    }
                  </div>
                  {/* Open column */}
                  <div className="dashboard-task-col">
                    <div className="dashboard-task-col-label">Open</div>
                    {(activeBuild.tasks || []).filter((t) => t.status === 'open').length === 0
                      ? <p className="empty-note" style={{ fontSize: '0.82rem' }}>None</p>
                      : (activeBuild.tasks || []).filter((t) => t.status === 'open').map((task) => {
                          const linkedPart = activeBuild.parts.find((p) => p.id === task.partId)
                          return (
                            <div key={task.id} className="dashboard-task-chip task-status-open" onClick={() => { startTransition(() => setActiveTab('tasks')); setExpandedTaskId(task.id) }}>
                              <strong>{task.title}</strong>
                              {linkedPart && <span>🔗 {linkedPart.name}</span>}
                              {task.deadline && <span>📅 {formatDate(task.deadline)}</span>}
                            </div>
                          )
                        })
                    }
                  </div>
                </div>
              )}
            </article>

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
                <AppSelect
                  onChange={(event) => {
                    const vt = event.target.value
                    const firstMake = getMakeOptions(vt)[0]
                    const firstModel = getModelOptions(firstMake)[0]
                    setNewBuild({ ...newBuild, vehicleType: vt, vehicleMake: firstMake, vehicleModel: firstModel })
                  }}
                  value={newBuild.vehicleType}
                >
                  {vehicleTypes.map((vehicleType) => <option key={vehicleType} value={vehicleType}>{vehicleType}</option>)}
                </AppSelect>
                <AppSelect onChange={(event) => setNewBuild({ ...newBuild, vehicleYear: event.target.value })} value={newBuild.vehicleYear}>
                  <option value="">Year</option>
                  {years.map((year) => <option key={year} value={year}>{year}</option>)}
                </AppSelect>
                <AppSelect
                  onChange={(event) => setNewBuild({ ...newBuild, vehicleMake: event.target.value, vehicleModel: getModelOptions(event.target.value)[0] })}
                  value={newBuild.vehicleMake}
                >
                  {getMakeOptions(newBuild.vehicleType).map((make) => <option key={make} value={make}>{make}</option>)}
                </AppSelect>
                <AppSelect onChange={(event) => setNewBuild({ ...newBuild, vehicleModel: event.target.value })} value={newBuild.vehicleModel}>
                  {getModelOptions(newBuild.vehicleMake).map((model) => <option key={model} value={model}>{model}</option>)}
                </AppSelect>
                <AppSelect onChange={(event) => setNewBuild({ ...newBuild, status: event.target.value })} value={newBuild.status}>
                  {buildStatuses.map((status) => <option key={status}>{status}</option>)}
                </AppSelect>
                <button className="button primary" type="submit">Create build</button>
              </form>
            </article>
          </section>
        )}

        {activeTab === 'tasks' && (
          <section className="page-section">
            {isShop ? (
              <article className="card">
                <div className="card-title">Add task</div>
                <form className="form-grid three" onSubmit={addTask}>
                  <input
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Task title"
                    value={newTask.title}
                  />
                  <AppSelect
                    onChange={(e) => setNewTask({ ...newTask, partId: e.target.value })}
                    value={newTask.partId}
                  >
                    <option value="">Not linked to a part</option>
                    {activeBuild.parts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </AppSelect>
                  <input
                    type="date"
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    value={newTask.deadline}
                  />
                  <textarea
                    className="span-two"
                    onChange={(e) => setNewTask({ ...newTask, details: e.target.value })}
                    placeholder="Task details"
                    rows="3"
                    value={newTask.details}
                  />
                  <div className="photo-upload-field">
                    <span className="field-label">Photos (optional)</span>
                    <input accept="image/*" multiple onChange={handleTaskPhotos} type="file" />
                  </div>
                  <button className="button primary" type="submit">Add task</button>
                </form>
                {newTask.photos.length > 0 && <PhotoStrip photos={newTask.photos} />}
              </article>
            ) : null}

            <article className="card">
              <div className="card-title">Tasks</div>
              {(activeBuild.tasks || []).length === 0 ? (
                <p className="empty-note">No tasks yet. Add one above to get started.</p>
              ) : (
                <div className="task-list">
                  {[...( activeBuild.tasks || [])].sort((a, b) => {
                    const order = { in_progress: 0, open: 1, done: 2 }
                    return (order[a.status] ?? 1) - (order[b.status] ?? 1)
                  }).map((task) => {
                    const linkedPart = activeBuild.parts.find((p) => p.id === task.partId)
                    const isExpanded = expandedTaskId === task.id
                    const noteDraft = taskNoteDrafts[task.id] ?? task.notes ?? ''
                    return (
                      <div key={task.id} className={`task-card task-status-${task.status}`}>
                        <div
                          className="task-card-header"
                          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                        >
                          <div className="task-card-title">
                            <strong>{task.title}</strong>
                            <div className="task-card-meta">
                              {linkedPart && <span>🔗 {linkedPart.name}</span>}
                              {task.deadline && <span>📅 {formatDate(task.deadline)}</span>}
                            </div>
                          </div>
                          <span className={`pill ${statusClass(task.status)}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className="task-expand-icon">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                        {isExpanded && (
                          <div className="task-card-body">
                            {task.details && (
                              <div className="task-details-block">
                                <span className="field-label">Details</span>
                                <p>{task.details}</p>
                              </div>
                            )}
                            <div>
                              <span className="field-label">In-progress notes</span>
                              <textarea
                                rows="3"
                                placeholder="Add notes as you work…"
                                value={noteDraft}
                                onChange={(e) => setTaskNoteDrafts((d) => ({ ...d, [task.id]: e.target.value }))}
                                onBlur={() => commitTaskNotes(task.id)}
                              />
                            </div>
                            {(task.photos || []).length > 0 && <PhotoStrip photos={task.photos} />}
                            {isShop && (
                              <div className="photo-upload-field inline-file-button">
                                <label className="button small subtle">
                                  Add photos
                                  <input accept="image/*" multiple onChange={(e) => addTaskPhoto(task.id, e)} type="file" style={{ display: 'none' }} />
                                </label>
                              </div>
                            )}
                            {isShop && (
                              <div className="row-actions">
                                <button className="button small subtle" onClick={() => cycleTaskStatus(task.id)}>
                                  {task.status === 'open' ? 'Start' : task.status === 'in_progress' ? 'Mark done' : 'Reopen'}
                                </button>
                                <button className="button small subtle delete-button" onClick={() => deleteTask(task.id)}>Delete</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
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
                  <AppSelect onChange={(event) => setNewPart({ ...newPart, category: event.target.value })} value={newPart.category}>
                    {partCategoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                  </AppSelect>
                  <AppSelect onChange={(event) => setNewPart({ ...newPart, source: event.target.value })} value={newPart.source}>
                    {partSources.map((source) => <option key={source} value={source}>{source}</option>)}
                  </AppSelect>
                  <input onChange={(event) => setNewPart({ ...newPart, vendor: event.target.value })} placeholder="Vendor / brand" value={newPart.vendor} />
                  <input onChange={(event) => setNewPart({ ...newPart, supplier: event.target.value })} placeholder="Supplier" value={newPart.supplier} />
                  <input min="1" onChange={(event) => setNewPart({ ...newPart, qty: event.target.value })} type="number" value={newPart.qty} />
                  <input min="0" onChange={(event) => setNewPart({ ...newPart, unitCost: event.target.value })} placeholder="Unit cost" step="0.01" type="number" value={newPart.unitCost} />
                  <AppSelect onChange={(event) => setNewPart({ ...newPart, status: event.target.value })} value={newPart.status}>
                    {partsStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </AppSelect>
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
                  <AppSelect onChange={(event) => setPartsFilter(event.target.value)} value={partsFilter}>
                    <option value="all">All statuses</option>
                    {partsStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                  </AppSelect>
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
                    ) : filteredParts.map((part) => {
                      const isEditing = isShop && editingPartId === part.id
                      if (isEditing && editDraft) {
                        return (
                          <tr key={part.id} className="editing-row">
                            <td>
                              <input value={editDraft.name} onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })} placeholder="Part name" />
                              <textarea value={editDraft.notes} onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })} placeholder="Notes" rows="2" style={{ marginTop: '6px' }} />
                            </td>
                            <td>
                              <AppSelect value={editDraft.category} onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}>
                                {partCategoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                              </AppSelect>
                            </td>
                            <td>
                              <AppSelect value={editDraft.source} onChange={(e) => setEditDraft({ ...editDraft, source: e.target.value })}>
                                {partSources.map((s) => <option key={s} value={s}>{s}</option>)}
                              </AppSelect>
                            </td>
                            <td>
                              <input value={editDraft.vendor} onChange={(e) => setEditDraft({ ...editDraft, vendor: e.target.value })} placeholder="Vendor" />
                              <input value={editDraft.supplier} onChange={(e) => setEditDraft({ ...editDraft, supplier: e.target.value })} placeholder="Supplier" style={{ marginTop: '6px' }} />
                            </td>
                            <td><input type="number" min="1" value={editDraft.qty} onChange={(e) => setEditDraft({ ...editDraft, qty: e.target.value })} style={{ minWidth: '60px' }} /></td>
                            <td><input type="number" min="0" step="0.01" value={editDraft.unitCost} onChange={(e) => setEditDraft({ ...editDraft, unitCost: e.target.value })} style={{ minWidth: '80px' }} /></td>
                            <td>{money.format(Number(editDraft.qty || 0) * Number(editDraft.unitCost || 0))}</td>
                            <td>
                              <AppSelect value={editDraft.status} onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}>
                                {partsStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                              </AppSelect>
                            </td>
                            <td>
                              <div className="row-actions">
                                <button className="button small primary" onClick={saveEditPart}>Save</button>
                                <button className="button small ghost" onClick={cancelEditPart}>Cancel</button>
                              </div>
                            </td>
                          </tr>
                        )
                      }
                      return (
                        <tr key={part.id}>
                          <td><strong>{part.name}</strong><span>{part.notes || 'No part notes'}</span><PhotoStrip photos={part.photos} /></td>
                          <td>{part.category}</td>
                          <td>{part.source || '-'}</td>
                          <td>{[part.vendor, part.supplier].filter(Boolean).join(' / ') || '-'}</td>
                          <td>{part.qty}</td>
                          <td>{money.format(part.unitCost)}</td>
                          <td>{money.format(part.qty * part.unitCost)}</td>
                          <td><span className={`pill ${statusClass(part.status)}`}>{part.status}</span></td>
                          <td>{isShop ? <div className="row-actions"><button className="button small subtle" onClick={() => startEditPart(part)}>Edit</button><button className="button small subtle" onClick={() => cyclePartStatus(part.id)}>Next</button><button className="button small subtle delete-button" onClick={() => deletePart(part.id)}>Delete</button></div> : '-'}</td>
                        </tr>
                      )
                    })}
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
              <>
                {/* ── Add connector ── */}
                <article className="card">
                  <div className="card-title">Connectors</div>
                  <form className="form-grid three" onSubmit={addConnector} style={{ marginBottom: (activeBuild.connectors || []).length ? '14px' : '0' }}>
                    <input onChange={(e) => setNewConnector({ ...newConnector, name: e.target.value })} placeholder="Connector name (e.g. ECU C1, Injector Rail)" value={newConnector.name} />
                    <input onChange={(e) => setNewConnector({ ...newConnector, description: e.target.value })} placeholder="Description / location (optional)" value={newConnector.description} />
                    <button className="button primary" type="submit">Add connector</button>
                  </form>
                  {(activeBuild.connectors || []).length > 0 && (
                    <div className="connector-chip-list">
                      {(activeBuild.connectors || []).map((c) => (
                        <div key={c.id} className="connector-chip">
                          <span className="connector-chip-name">{c.name}</span>
                          {c.description && <span className="connector-chip-desc">{c.description}</span>}
                          <span className="connector-chip-count">
                            {activeBuild.pins.filter((p) => p.fromConnectorId === c.id || p.toConnectorId === c.id).length} wires
                          </span>
                          <button className="button small subtle delete-button" onClick={() => deleteConnector(c.id)}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </article>

                {/* ── Add wire ── */}
                <article className="card">
                  <div className="card-title">Add wire / connection</div>
                  <form onSubmit={addPin}>
                    {/* Endpoint row */}
                    <div className="wire-endpoint-row">
                      <div className="wire-endpoint">
                        <label className="wire-endpoint-label">From</label>
                        <AppSelect onChange={(e) => setNewPin({ ...newPin, fromConnectorId: e.target.value })} value={newPin.fromConnectorId}>
                          <option value="">— connector —</option>
                          {(activeBuild.connectors || []).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </AppSelect>
                        <input onChange={(e) => setNewPin({ ...newPin, fromPin: e.target.value })} placeholder="Pin / terminal" value={newPin.fromPin} />
                      </div>
                      <div className="wire-arrow">→</div>
                      <div className="wire-endpoint">
                        <label className="wire-endpoint-label">To</label>
                        <AppSelect onChange={(e) => setNewPin({ ...newPin, toConnectorId: e.target.value })} value={newPin.toConnectorId}>
                          <option value="">— connector —</option>
                          {(activeBuild.connectors || []).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </AppSelect>
                        <input onChange={(e) => setNewPin({ ...newPin, toPin: e.target.value })} placeholder="Pin / terminal" value={newPin.toPin} />
                      </div>
                    </div>
                    {/* Wire info row */}
                    <div className="form-grid four" style={{ marginTop: '10px' }}>
                      <input onChange={(e) => setNewPin({ ...newPin, function: e.target.value })} placeholder="Signal / function" value={newPin.function} />
                      <AppSelect onChange={(e) => setNewPin({ ...newPin, type: e.target.value })} value={newPin.type}>
                        {pinTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                      </AppSelect>
                      <input onChange={(e) => setNewPin({ ...newPin, wireGauge: e.target.value })} placeholder="Wire gauge (18AWG)" value={newPin.wireGauge} />
                      <input onChange={(e) => setNewPin({ ...newPin, wireColor: e.target.value })} placeholder="Wire color" value={newPin.wireColor} />
                      <button className="button primary" type="submit">Add wire</button>
                    </div>
                  </form>
                </article>
              </>
            ) : null}

            {/* ── Pin map ── */}
            <article className="card">
              <div className="card-toolbar">
                <div className="card-title">Wiring / pin map</div>
                <div className="toolbar-controls single">
                  <input onChange={(event) => setPinQuery(event.target.value)} placeholder="Search pins" value={pinQuery} />
                </div>
              </div>

              {/* Flat search results */}
              {pinQuery.trim() ? (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>From</th><th>Pin</th><th>→</th><th>To</th><th>Pin</th>
                        <th>Function</th><th>Type</th><th>Gauge</th><th>Color</th><th>Verified</th><th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPins.length === 0
                        ? <tr><td className="empty-cell" colSpan="11">No wires match your search.</td></tr>
                        : filteredPins.map((pin) => {
                            const fromConn = (activeBuild.connectors || []).find((c) => c.id === pin.fromConnectorId)
                            const toConn = (activeBuild.connectors || []).find((c) => c.id === pin.toConnectorId)
                            return (
                              <tr key={pin.id}>
                                <td>{fromConn ? <span className="connector-tag">{fromConn.name}</span> : <span style={{ color: 'var(--text-soft)' }}>—</span>}</td>
                                <td>{pin.fromPin || '—'}</td>
                                <td style={{ color: 'var(--accent)', fontWeight: 600 }}>→</td>
                                <td>{toConn ? <span className="connector-tag">{toConn.name}</span> : <span style={{ color: 'var(--text-soft)' }}>—</span>}</td>
                                <td>{pin.toPin || '—'}</td>
                                <td>{pin.function || '-'}</td>
                                <td>{pin.type || '-'}</td>
                                <td>{pin.wireGauge || '-'}</td>
                                <td>{pin.wireColor || '-'}</td>
                                <td><button className={`pill buttonless ${pin.verified ? 'good' : 'neutral'}`} disabled={!isShop} onClick={() => togglePin(pin.id)}>{pin.verified ? 'Verified' : 'Needs check'}</button></td>
                                <td>{isShop ? <button className="button small subtle delete-button" onClick={() => deletePin(pin.id)}>Delete</button> : '-'}</td>
                              </tr>
                            )
                          })
                      }
                    </tbody>
                  </table>
                </div>
              ) : (activeBuild.pins.length === 0 ? (
                <p className="empty-note">No wires yet. Add connectors first, then add wires between them.</p>
              ) : (
                <div className="connector-sections">
                  {/* One section per connector — shows all wires touching it */}
                  {(activeBuild.connectors || []).map((connector) => {
                    const connWires = activeBuild.pins.filter((p) => p.fromConnectorId === connector.id || p.toConnectorId === connector.id)
                    const verifiedCount = connWires.filter((p) => p.verified).length
                    const isCollapsed = collapsedConnectors[connector.id]
                    return (
                      <div key={connector.id} className="connector-section">
                        <div className="connector-section-header" onClick={() => setCollapsedConnectors((prev) => ({ ...prev, [connector.id]: !prev[connector.id] }))}>
                          <div className="connector-section-title">
                            <strong>{connector.name}</strong>
                            {connector.description && <span className="connector-section-desc">{connector.description}</span>}
                          </div>
                          <div className="connector-section-meta">
                            <span className="pill neutral">{connWires.length} wire{connWires.length !== 1 ? 's' : ''}</span>
                            {connWires.length > 0 && <span className={`pill ${verifiedCount === connWires.length ? 'good' : 'neutral'}`}>{verifiedCount}/{connWires.length} verified</span>}
                          </div>
                          <span className="task-expand-icon">{isCollapsed ? '▼' : '▲'}</span>
                        </div>
                        {!isCollapsed && (
                          <div className="table-wrap connector-table">
                            <table>
                              <thead>
                                <tr><th>From</th><th>Pin</th><th>→</th><th>To</th><th>Pin</th><th>Function</th><th>Type</th><th>Gauge</th><th>Color</th><th>Verified</th><th /></tr>
                              </thead>
                              <tbody>
                                {connWires.length === 0
                                  ? <tr><td className="empty-cell" colSpan="11">No wires on this connector yet.</td></tr>
                                  : connWires.map((pin) => {
                                      const fromConn = (activeBuild.connectors || []).find((c) => c.id === pin.fromConnectorId)
                                      const toConn = (activeBuild.connectors || []).find((c) => c.id === pin.toConnectorId)
                                      return (
                                        <tr key={pin.id}>
                                          <td>{fromConn ? <span className={`connector-tag${pin.fromConnectorId === connector.id ? ' good' : ''}`}>{fromConn.name}</span> : <span style={{ color: 'var(--text-soft)' }}>—</span>}</td>
                                          <td>{pin.fromPin || '—'}</td>
                                          <td style={{ color: 'var(--accent)', fontWeight: 600 }}>→</td>
                                          <td>{toConn ? <span className={`connector-tag${pin.toConnectorId === connector.id ? ' good' : ''}`}>{toConn.name}</span> : <span style={{ color: 'var(--text-soft)' }}>—</span>}</td>
                                          <td>{pin.toPin || '—'}</td>
                                          <td>{pin.function || '-'}</td>
                                          <td>{pin.type || '-'}</td>
                                          <td>{pin.wireGauge || '-'}</td>
                                          <td>{pin.wireColor || '-'}</td>
                                          <td><button className={`pill buttonless ${pin.verified ? 'good' : 'neutral'}`} disabled={!isShop} onClick={() => togglePin(pin.id)}>{pin.verified ? 'Verified' : 'Needs check'}</button></td>
                                          <td>{isShop ? <button className="button small subtle delete-button" onClick={() => deletePin(pin.id)}>Delete</button> : '-'}</td>
                                        </tr>
                                      )
                                    })
                                }
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Unrouted wires — both endpoints unassigned */}
                  {(() => {
                    const unrouted = activeBuild.pins.filter((p) => !p.fromConnectorId && !p.toConnectorId)
                    if (unrouted.length === 0) return null
                    const isCollapsed = collapsedConnectors['__unrouted__']
                    return (
                      <div className="connector-section">
                        <div className="connector-section-header" onClick={() => setCollapsedConnectors((prev) => ({ ...prev, __unrouted__: !prev.__unrouted__ }))}>
                          <div className="connector-section-title">
                            <strong>Unrouted</strong>
                            <span className="connector-section-desc">Wires not assigned to any connector</span>
                          </div>
                          <div className="connector-section-meta">
                            <span className="pill neutral">{unrouted.length} wire{unrouted.length !== 1 ? 's' : ''}</span>
                          </div>
                          <span className="task-expand-icon">{isCollapsed ? '▼' : '▲'}</span>
                        </div>
                        {!isCollapsed && (
                          <div className="table-wrap connector-table">
                            <table>
                              <thead>
                                <tr><th>From pin</th><th>→</th><th>To pin</th><th>Function</th><th>Type</th><th>Gauge</th><th>Color</th><th>Verified</th><th /></tr>
                              </thead>
                              <tbody>
                                {unrouted.map((pin) => (
                                  <tr key={pin.id}>
                                    <td>{pin.fromPin || '—'}</td>
                                    <td style={{ color: 'var(--accent)', fontWeight: 600 }}>→</td>
                                    <td>{pin.toPin || '—'}</td>
                                    <td>{pin.function || '-'}</td>
                                    <td>{pin.type || '-'}</td>
                                    <td>{pin.wireGauge || '-'}</td>
                                    <td>{pin.wireColor || '-'}</td>
                                    <td><button className={`pill buttonless ${pin.verified ? 'good' : 'neutral'}`} disabled={!isShop} onClick={() => togglePin(pin.id)}>{pin.verified ? 'Verified' : 'Needs check'}</button></td>
                                    <td>{isShop ? <button className="button small subtle delete-button" onClick={() => deletePin(pin.id)}>Delete</button> : '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              ))}
            </article>

            {/* ── Wiring diagram ── */}
            <WiringDiagram connectors={activeBuild.connectors || []} pins={activeBuild.pins} />

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
                    <AppSelect onChange={(event) => setNewTune({ ...newTune, ecuPlatform: event.target.value })} value={newTune.ecuPlatform}>
                      {ecuPlatforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                    </AppSelect>
                    <AppSelect onChange={(event) => setNewTune({ ...newTune, tuneType: event.target.value })} value={newTune.tuneType}>
                      {tuneTypes.map((tuneType) => <option key={tuneType} value={tuneType}>{tuneType}</option>)}
                    </AppSelect>
                    <AppSelect onChange={(event) => setNewTune({ ...newTune, status: event.target.value })} value={newTune.status}>
                      {tuneStatuses.map((status) => <option key={status}>{status}</option>)}
                    </AppSelect>
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
                      <AppSelect onChange={(event) => setPendingLogImport((current) => ({ ...current, delimiter: event.target.value, ...parseDataLogText(current.text, event.target.value) }))} value={pendingLogImport.delimiter}>
                        <option value=",">Comma</option>
                        <option value=";">Semicolon</option>
                      </AppSelect>
                    </label>
                    <label>
                      <span className="field-label">Time column</span>
                      <AppSelect onChange={(event) => setPendingLogImport((current) => ({ ...current, timeColumn: event.target.value }))} value={pendingLogImport.timeColumn}>
                        <option value="">Select time column</option>
                        {pendingLogImport.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                      </AppSelect>
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
                          <AppSelect onChange={(event) => updateSelectedLogChannel(index, event.target.value)} value={selectedLogChannels[index] || ''}>
                            <option value="">None</option>
                            {availableLogChannels.map((channel) => <option key={channel} value={channel}>{channel}</option>)}
                          </AppSelect>
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

            {authState.status === 'cloud' ? (
              <BillingCard
                billingBusy={billingBusy}
                currentTier={currentTier}
                onManage={handleManageBilling}
                onUpgrade={handleUpgrade}
              />
            ) : null}

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
                  <label><span className="field-label">Vehicle type</span><AppSelect onChange={(event) => updateActiveBuild((build) => { const vehicleType = event.target.value; const vehicleMake = getMakeOptions(vehicleType)[0]; const vehicleModel = getModelOptions(vehicleMake)[0]; const next = { ...build, vehicleType, vehicleMake, vehicleModel, updatedAt: new Date().toISOString() }; next.vehicle = getVehicleLabel(next); return next })} value={activeBuild.vehicleType || 'Truck'}>{vehicleTypes.map((vehicleType) => <option key={vehicleType} value={vehicleType}>{vehicleType}</option>)}</AppSelect></label>
                  <label><span className="field-label">Vehicle year</span><AppSelect onChange={(event) => updateBuildVehicleField('vehicleYear', event.target.value)} value={activeBuild.vehicleYear || ''}><option value="">Year</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</AppSelect></label>
                  <label><span className="field-label">Vehicle make</span><AppSelect onChange={(event) => updateActiveBuild((build) => { const vehicleMake = event.target.value; const vehicleModel = getModelOptions(vehicleMake)[0]; const next = { ...build, vehicleMake, vehicleModel, updatedAt: new Date().toISOString() }; next.vehicle = getVehicleLabel(next); return next })} value={activeBuild.vehicleMake || getMakeOptions(activeBuild.vehicleType || 'Truck')[0]}>{getMakeOptions(activeBuild.vehicleType || 'Truck').map((make) => <option key={make} value={make}>{make}</option>)}</AppSelect></label>
                  <label><span className="field-label">Vehicle model</span><AppSelect onChange={(event) => updateBuildVehicleField('vehicleModel', event.target.value)} value={activeBuild.vehicleModel || getModelOptions(activeBuild.vehicleMake || getMakeOptions(activeBuild.vehicleType || 'Truck')[0])[0]}>{getModelOptions(activeBuild.vehicleMake || getMakeOptions(activeBuild.vehicleType || 'Truck')[0]).map((model) => <option key={model} value={model}>{model}</option>)}</AppSelect></label>
                  <label><span className="field-label">Build status</span><AppSelect onChange={(event) => updateBuildField('status', event.target.value)} value={activeBuild.status}>{buildStatuses.map((status) => <option key={status}>{status}</option>)}</AppSelect></label>
                  <label><span className="field-label">Budget target</span><input onChange={(event) => updateBuildBudget(event.target.value)} type="number" value={activeBuild.budget.target} /></label>
                  <label><span className="field-label">Client name</span><input onChange={(event) => updateClientField('name', event.target.value)} value={activeBuild.client.name} /></label>
                  <label><span className="field-label">Client email</span><input onChange={(event) => updateClientField('email', event.target.value)} value={activeBuild.client.email} /></label>
                  <label><span className="field-label">Portal status</span><AppSelect onChange={(event) => updateClientField('portalStatus', event.target.value)} value={activeBuild.client.portalStatus}>{portalStatuses.map((status) => <option key={status}>{status}</option>)}</AppSelect></label>
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
