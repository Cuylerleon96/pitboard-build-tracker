// Status and type constants
export const partsStatuses = ['planned', 'quoted', 'ordered', 'received', 'installed', 'blocked']
export const tabs = ['dashboard', 'builds', 'tasks', 'parts', 'wiring', 'tunes', 'labor', 'journal', 'settings']
export const customerTabs = ['dashboard', 'parts', 'wiring', 'tunes', 'journal', 'settings']
export const taskStatuses = ['open', 'in_progress', 'done']
export const roles = ['shop', 'customer']
export const tiers = ['free', 'garage', 'shop']
export const vehicleTypes = ['Car', 'Truck', 'Motorcycle', 'UTV', 'Boat']
export const years = Array.from({ length: 48 }, (_, index) => String(new Date().getFullYear() + 1 - index))
export const makesByVehicleType = {
  Car: ['Nissan', 'Ford', 'Chevrolet', 'Toyota', 'Honda', 'Dodge', 'Jeep', 'BMW', 'Mercedes-Benz', 'Subaru', 'Mazda', 'Mitsubishi', 'Other'],
  Truck: ['Nissan', 'Ford', 'Chevrolet', 'Toyota', 'Honda', 'Dodge', 'Ram', 'GMC', 'Other'],
  Motorcycle: ['Yamaha', 'Honda', 'Kawasaki', 'Suzuki', 'Ducati', 'Harley-Davidson', 'BMW', 'KTM', 'Royal Enfield', 'Triumph', 'Other'],
  UTV: ['Polaris', 'Can-Am', 'Yamaha', 'Honda', 'Kawasaki', 'Arctic Cat', 'Textron', 'Other'],
  Boat: ['Yamaha', 'Mercury', 'MerCruiser', 'Volvo Penta', 'Evinrude', 'Boston Whaler', 'Sea Ray', 'Other'],
}
export const modelsByMake = {
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
export const partCategoriesByVehicleType = {
  Car: ['Engine', 'Fuel System', 'Turbo System', 'Cooling', 'ECU / Wiring', 'Sensors', 'Suspension', 'Brakes', 'Body', 'Interior', 'Exhaust', 'General'],
  Truck: ['Engine', 'Fuel System', 'Turbo System', 'Cooling', 'ECU / Wiring', 'Sensors', 'Suspension', 'Brakes', 'Body', 'Interior', 'Exhaust', 'General'],
  Motorcycle: ['Engine', 'Fuel/Carb', 'Suspension/Forks', 'Chain/Sprockets', 'Brakes', 'Bodywork/Fairings', 'Electrical', 'Exhaust'],
  UTV: ['Engine', 'Fuel System', 'Driveline', 'Suspension', 'Brakes', 'Electrical', 'Safety Cage', 'Cooling', 'General'],
  Boat: ['Engine', 'Fuel System', 'Electrical', 'Cooling', 'Propulsion', 'Hull/Deck', 'Rigging', 'General'],
}
export const pinTypes = ['Analog 0-5V', 'Analog NTC', 'Digital input', 'Digital output', 'Ground', '5V reference', 'PWM output', 'Injector output', 'Ignition output', 'Other']
export const tuneStatuses = ['Testing', 'Approved', 'Archived']
export const ecuPlatforms = ['Speeduino', 'Haltech', 'Link G4X', 'Motec', 'Power Commander', 'Bazzaz', 'Woolich Racing', 'AEM', 'MegaSquirt', 'Other']
export const tuneTypes = ['Base Map', 'Street', 'Track', 'WOT Pull', 'E85', 'Flex Fuel', 'Dyno Pull', 'Other']
export const partSources = ['OEM', 'OE Replacement', 'Aftermarket', 'Fabricated', 'Junkyard/Pull']
export const buildStatuses = ['Planning', 'In Progress', 'Waiting', 'Delivered']
export const portalStatuses = ['Not invited', 'Invite pending', 'Portal active', 'Portal paused']
export const logChannelSuggestions = ['RPM', 'MAP', 'TPS', 'AFR', 'Lambda', 'IAT', 'CLT', 'Ignition Advance', 'Injector PW', 'Battery Voltage']
export const chartColors = ['#f97316', '#6aa7ff', '#52d08d', '#f2c078']

// Formatter
export const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

// Utility functions
export function cloneWorkspace(data) {
  return JSON.parse(JSON.stringify(data))
}

export function makeId(_prefix) {
  return crypto.randomUUID()
}

export function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

export function formatDate(value) {
  if (!value) return 'No date'
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return 'No activity yet'
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function totalPartsCost(parts) {
  return parts.reduce((sum, part) => sum + Number(part.unitCost || 0) * Number(part.qty || 0), 0)
}

export function totalLaborCost(entries) {
  return entries.reduce((sum, entry) => sum + Number(entry.hours || 0) * Number(entry.rate || 0), 0)
}

export function getMetrics(build) {
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

export function statusClass(status) {
  if (['installed', 'active', 'approved', 'done'].includes(String(status).toLowerCase())) return 'good'
  if (['blocked', 'on hold'].includes(String(status).toLowerCase())) return 'bad'
  if (['quoted', 'ordered', 'received', 'testing', 'in_progress'].includes(String(status).toLowerCase())) return 'warn'
  return 'neutral'
}

export function getVehicleLabel(build) {
  if (build.vehicleYear || build.vehicleMake || build.vehicleModel) {
    return [build.vehicleYear, build.vehicleMake, build.vehicleModel].filter(Boolean).join(' ') || 'Year Make Model'
  }
  return build.vehicle || 'Year Make Model'
}

export function getMakeOptions(vehicleType) {
  return makesByVehicleType[vehicleType] || makesByVehicleType.Car
}

export function getModelOptions(make) {
  return modelsByMake[make] || ['Custom', 'Other']
}

export function getPartCategoryOptions(vehicleType) {
  return partCategoriesByVehicleType[vehicleType] || partCategoriesByVehicleType.Truck
}

// Data parsing utilities
export function parseDelimitedLine(line, delimiter) {
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

export function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).find((line) => line.trim())
  if (!sample) return ','
  const commaCount = (sample.match(/,/g) || []).length
  const semicolonCount = (sample.match(/;/g) || []).length
  if (!commaCount && !semicolonCount) return ''
  return semicolonCount > commaCount ? ';' : ','
}

export function parseDataLogText(text, delimiter) {
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

export function detectTimeColumn(headers, rows) {
  const byName = headers.find((header) => /^(time|seconds|sec|timestamp)$/i.test(header))
  if (byName) return byName
  const firstHeader = headers[0]
  if (!firstHeader) return ''
  const numericEnough = rows.slice(0, 8).every((row) => Number.isFinite(Number(row[firstHeader])))
  return numericEnough ? firstHeader : ''
}

export function normalizeChannelName(channel) {
  return channel.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

export function getSuggestedChannels(headers) {
  const suggestions = logChannelSuggestions
    .map((suggestion) => headers.find((header) => normalizeChannelName(header).includes(normalizeChannelName(suggestion))))
    .filter(Boolean)

  return [...new Set(suggestions)].slice(0, 4)
}

// File handling
export function getFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Tech notes
export function getEmptyTechnicianNotes() {
  return { dashboard: [], parts: [], wiring: [], tunes: [], journal: [] }
}

// Tune import
export function extractTuneValue(text, key) {
  const match = text.match(new RegExp(`^${key}\\s*=\\s*([^\\r\\n]+)`, 'm'))
  return match ? match[1].trim() : ''
}

export function summarizeTuneImport(fileName, text) {
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

// Auth display
export function getAuthDisplayName(user) {
  return user?.user_metadata?.full_name || user?.user_metadata?.name || ''
}
