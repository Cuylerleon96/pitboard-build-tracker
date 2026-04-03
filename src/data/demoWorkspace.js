const now = new Date().toISOString()

export const demoWorkspace = {
  shop: {
    name: 'BuildPortal',
    subtitle: 'Customer-facing build tracking for shops and custom projects',
    email: '',
    tier: 'free',
  },
  builds: [
    {
      id: 'starter-build',
      slug: 'starter-build',
      name: 'Starter Build',
      vehicleType: 'Truck',
      vehicleYear: '',
      vehicleMake: 'Nissan',
      vehicleModel: 'D21 Pickup',
      vehicle: 'Year Make Model',
      status: 'Planning',
      brief: 'Use this build as a clean starting point for your shop or personal project.',
      nextMilestone: 'Define the project scope, add parts, and record the first milestone.',
      portalSummary: 'No customer summary has been written yet.',
      updatedAt: now,
      budget: { target: 0 },
      client: {
        name: '',
        email: '',
        portalStatus: 'Not invited',
      },
      phases: [
        { id: 'phase-scope', name: 'Scope project', owner: '', done: false, blockedOn: '' },
        { id: 'phase-parts', name: 'Plan parts', owner: '', done: false, blockedOn: '' },
        { id: 'phase-fabrication', name: 'Fabrication / install', owner: '', done: false, blockedOn: '' },
        { id: 'phase-testing', name: 'Testing / tune', owner: '', done: false, blockedOn: '' },
      ],
      parts: [],
      pins: [],
      tunes: [],
      labor: [],
      shopSnapshot: {
        name: 'BuildPortal',
        subtitle: 'Customer-facing build tracking for shops and custom projects',
        email: '',
        tier: 'free',
      },
      technicianNotes: {
        dashboard: [],
        parts: [],
        wiring: [],
        tunes: [],
        journal: [],
      },
      journal: [
        {
          id: 'entry-start',
          at: now,
          text: 'Workspace created. Start by editing the build details and adding your first items.',
          photos: [],
        },
      ],
    },
  ],
}
