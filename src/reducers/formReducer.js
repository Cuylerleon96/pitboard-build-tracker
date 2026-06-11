import { getMakeOptions, getModelOptions } from '../constants'

const initialState = {
  // Parts
  partsQuery: '',
  partsFilter: 'all',
  editingPartId: null,
  editDraft: null,
  newPart: { name: '', category: 'Engine', qty: 1, unitCost: '', status: 'planned', source: 'Aftermarket', vendor: '', supplier: '', notes: '', photos: [] },
  // Tasks
  newTask: { title: '', partId: '', deadline: '', details: '', photos: [] },
  expandedTaskId: null,
  taskNoteDrafts: {},
  // Wiring
  pinQuery: '',
  newPin: { fromConnectorId: '', fromPin: '', toConnectorId: '', toPin: '', function: '', type: 'Analog 0-5V', wireGauge: '', wireColor: '' },
  newConnector: { name: '', description: '' },
  collapsedConnectors: {},
  // Tunes
  newTune: { version: '', name: '', status: 'Testing', power: '', torque: '', boost: '', ecuPlatform: 'Speeduino', tuneType: 'Base Map' },
  selectedTuneId: null,
  selectedLogChannels: [],
  pendingLogImport: null,
  // Journal
  newLog: '',
  journalDraftPhotos: [],
  // Labor
  newLabor: { date: new Date().toISOString().slice(0, 10), task: '', hours: '', rate: '' },
  // Builds
  newBuild: {
    name: '',
    vehicleType: 'Truck',
    vehicleYear: '',
    vehicleMake: getMakeOptions('Truck')[0],
    vehicleModel: getModelOptions(getMakeOptions('Truck')[0])[0],
    status: 'Planning',
  },
  // Technician notes
  techDrafts: { dashboard: '', parts: '', wiring: '', tunes: '', journal: '' },
}

export function getInitialFormState() {
  return { ...initialState }
}

export function formReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return { ...state, [action.field]: action.value }
    case 'SET_TASK_NOTE':
      return { ...state, taskNoteDrafts: { ...state.taskNoteDrafts, [action.id]: action.value } }
    case 'SET_COLLAPSED':
      return { ...state, collapsedConnectors: { ...state.collapsedConnectors, [action.id]: !state.collapsedConnectors[action.id] } }
    case 'SET_TECH_DRAFT':
      return { ...state, techDrafts: { ...state.techDrafts, [action.section]: action.value } }
    case 'RESET_NEW_BUILD':
      return { ...state, newBuild: initialState.newBuild }
    case 'RESET_NEW_PART':
      return { ...state, newPart: { ...initialState.newPart, category: action.category || initialState.newPart.category } }
    case 'RESET_NEW_TASK':
      return { ...state, newTask: initialState.newTask }
    case 'RESET_NEW_PIN':
      return { ...state, newPin: { ...initialState.newPin, fromConnectorId: state.newPin.fromConnectorId, toConnectorId: state.newPin.toConnectorId } }
    case 'RESET_NEW_CONNECTOR':
      return { ...state, newConnector: initialState.newConnector }
    case 'RESET_NEW_TUNE':
      return { ...state, newTune: initialState.newTune }
    case 'RESET_NEW_LABOR':
      return { ...state, newLabor: initialState.newLabor }
    default:
      return state
  }
}
