import { startTransition, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState } from 'react'
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
  queueSave,
  saveWorkspaceLocalDebounced,
  signInWithGoogle,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  subscribeToAuth,
  updateProfileByAdmin,
  upsertProfile,
} from './lib/dataClient'
import {
  partsStatuses,
  tabs,
  customerTabs,
  taskStatuses,
  roles,
  vehicleTypes,
  years,
  pinTypes,
  tuneStatuses,
  ecuPlatforms,
  tuneTypes,
  partSources,
  buildStatuses,
  portalStatuses,
  chartColors,
  money,
  cloneWorkspace,
  makeId,
  slugify,
  formatDate,
  formatDateTime,
  totalLaborCost,
  getMetrics,
  statusClass,
  getVehicleLabel,
  getMakeOptions,
  getModelOptions,
  getPartCategoryOptions,
  detectDelimiter,
  parseDataLogText,
  detectTimeColumn,
  getSuggestedChannels,
  getFileDataUrl,
  getEmptyTechnicianNotes,
  summarizeTuneImport,
  getAuthDisplayName,
} from './constants'
import { AppProvider } from './context/AppContext'
import { formReducer, getInitialFormState } from './reducers/formReducer'
import AppSelect from './components/AppSelect'
import AuthScreen from './components/AuthScreen'
import ProfileSetupScreen from './components/ProfileSetupScreen'
import TechnicianNotes from './components/TechnicianNotes'
import BillingCard from './components/BillingCard'
import TeamAdminCard from './components/TeamAdminCard'
import PortalModeToggle from './components/PortalModeToggle'
import PhotoStrip from './components/PhotoStrip'
import UpgradeHint from './components/UpgradeHint'
import DashboardTab from './components/tabs/DashboardTab'
import BuildsTab from './components/tabs/BuildsTab'
import TasksTab from './components/tabs/TasksTab'
import PartsTab from './components/tabs/PartsTab'
import WiringTab from './components/tabs/WiringTab'
import TunesTab from './components/tabs/TunesTab'
import JournalTab from './components/tabs/JournalTab'
import LaborTab from './components/tabs/LaborTab'
import SettingsTab from './components/tabs/SettingsTab'

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
  const [form, dispatch] = useReducer(formReducer, null, getInitialFormState)
  // Derived setters that match the old useState API — tab components use these unchanged
  const setPartsQuery = (v) => dispatch({ type: 'SET', field: 'partsQuery', value: typeof v === 'function' ? v(form.partsQuery) : v })
  const setPartsFilter = (v) => dispatch({ type: 'SET', field: 'partsFilter', value: v })
  const setEditingPartId = (v) => dispatch({ type: 'SET', field: 'editingPartId', value: v })
  const setEditDraft = (v) => dispatch({ type: 'SET', field: 'editDraft', value: typeof v === 'function' ? v(form.editDraft) : v })
  const setNewTask = (v) => dispatch({ type: 'SET', field: 'newTask', value: typeof v === 'function' ? v(form.newTask) : v })
  const setExpandedTaskId = (v) => dispatch({ type: 'SET', field: 'expandedTaskId', value: v })
  const setTaskNoteDrafts = (v) => dispatch({ type: 'SET', field: 'taskNoteDrafts', value: typeof v === 'function' ? v(form.taskNoteDrafts) : v })
  const setPinQuery = (v) => dispatch({ type: 'SET', field: 'pinQuery', value: typeof v === 'function' ? v(form.pinQuery) : v })
  const setNewLog = (v) => dispatch({ type: 'SET', field: 'newLog', value: v })
  const setJournalDraftPhotos = (v) => dispatch({ type: 'SET', field: 'journalDraftPhotos', value: typeof v === 'function' ? v(form.journalDraftPhotos) : v })
  const setNewBuild = (v) => dispatch({ type: 'SET', field: 'newBuild', value: typeof v === 'function' ? v(form.newBuild) : v })
  const setNewPart = (v) => dispatch({ type: 'SET', field: 'newPart', value: typeof v === 'function' ? v(form.newPart) : v })
  const setNewPin = (v) => dispatch({ type: 'SET', field: 'newPin', value: typeof v === 'function' ? v(form.newPin) : v })
  const setNewConnector = (v) => dispatch({ type: 'SET', field: 'newConnector', value: typeof v === 'function' ? v(form.newConnector) : v })
  const setCollapsedConnectors = (v) => dispatch({ type: 'SET', field: 'collapsedConnectors', value: typeof v === 'function' ? v(form.collapsedConnectors) : v })
  const setNewTune = (v) => dispatch({ type: 'SET', field: 'newTune', value: typeof v === 'function' ? v(form.newTune) : v })
  const setNewLabor = (v) => dispatch({ type: 'SET', field: 'newLabor', value: typeof v === 'function' ? v(form.newLabor) : v })
  const setSelectedTuneId = (v) => dispatch({ type: 'SET', field: 'selectedTuneId', value: v })
  const setSelectedLogChannels = (v) => dispatch({ type: 'SET', field: 'selectedLogChannels', value: typeof v === 'function' ? v(form.selectedLogChannels) : v })
  const setPendingLogImport = (v) => dispatch({ type: 'SET', field: 'pendingLogImport', value: v })
  const setTechDrafts = (v) => dispatch({ type: 'SET', field: 'techDrafts', value: typeof v === 'function' ? v(form.techDrafts) : v })

  // Destructure form fields for use in handlers and JSX
  const { partsQuery, partsFilter, editingPartId, editDraft, newTask, expandedTaskId, taskNoteDrafts,
    pinQuery, newLog, journalDraftPhotos, newBuild, newPart, newPin, newConnector,
    collapsedConnectors, newTune, newLabor, selectedTuneId, selectedLogChannels,
    pendingLogImport, techDrafts } = form

  const deferredPartsQuery = useDeferredValue(partsQuery)
  const deferredPinQuery = useDeferredValue(pinQuery)
  const [billingBusy, setBillingBusy] = useState(false)

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

    saveWorkspaceLocalDebounced(nextWorkspace)
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

    saveWorkspaceLocalDebounced(nextWorkspace)
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
  const contextValue = {
    // Core state
    workspace, setWorkspace, activeBuild, activeBuildId, setActiveBuildId,
    activeTab, setActiveTab, notice, setNotice,
    authState, profile, hasShopAdmin, teamProfiles,
    authMode, authBusy, portalMode, role,
    // Derived
    metrics, currentTier, hasGarageTier, hasShopTier, shopAccount, canEdit, isShop, isAdmin,
    visibleTabs, selectedTune, selectedTuneLog, availableLogChannels,
    laborSpend, partCategoryOptions, activeShopSnapshot,
    filteredParts, filteredPins,
    // Form state
    newBuild, setNewBuild, newPart, setNewPart, newTask, setNewTask,
    newPin, setNewPin, newConnector, setNewConnector, newTune, setNewTune,
    newLabor, setNewLabor, newLog, setNewLog,
    journalDraftPhotos, setJournalDraftPhotos,
    partsQuery, setPartsQuery, partsFilter, setPartsFilter,
    pinQuery, setPinQuery,
    editingPartId, setEditingPartId, editDraft, setEditDraft,
    expandedTaskId, setExpandedTaskId, taskNoteDrafts, setTaskNoteDrafts,
    collapsedConnectors, setCollapsedConnectors,
    selectedTuneId, setSelectedTuneId, selectedLogChannels, setSelectedLogChannels,
    pendingLogImport, setPendingLogImport,
    techDrafts, setTechDrafts, billingBusy, setBillingBusy,
    authForm, setAuthForm,
    // Handlers
    persistWorkspace, updateActiveBuild,
    addTechnicianNote, deleteTechnicianNote,
    updateShopField, updateBuildField, updateBuildVehicleField, updateBuildBudget, updateClientField,
    deleteBuild, updatePhase, addBuild,
    addPart, deletePart, startEditPart, cancelEditPart, saveEditPart, cyclePartStatus,
    addTask, deleteTask, cycleTaskStatus, commitTaskNotes, handleTaskPhotos, addTaskPhoto,
    addPin, deletePin, addConnector, deleteConnector, togglePin,
    addTune, deleteTune, downloadTuneSource, importTuneFile,
    addLogEntry, deleteJournalEntry, handlePartPhotos, handleJournalPhotos,
    addLaborEntry, deleteLaborEntry,
    selectPortalMode, updateSelectedLogChannel, savePendingLogImport, importDataLog,
    updateAuthForm, persistProfile, handleSignOut, handleUpgrade, handleManageBilling,
    promoteProfile, refreshTeamProfiles,
    // React utilities
    startTransition,
  }
  return (
    <AppProvider value={contextValue}>
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
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'builds' && <BuildsTab />}
        {activeTab === 'tasks' && <TasksTab />}
        {activeTab === 'parts' && <PartsTab />}
        {activeTab === 'wiring' && <WiringTab />}
        {activeTab === 'tunes' && <TunesTab />}
        {activeTab === 'journal' && <JournalTab />}
        {activeTab === 'labor' && hasShopTier && <LaborTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>
    </div>
    </AppProvider>
  )
}

export default App
