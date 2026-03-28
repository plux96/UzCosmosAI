import { create } from 'zustand'

const REQUIRED_DATA = ['satellites', 'debris', 'solar', 'iss', 'asteroids', 'launches', 'radiation', 'ai_threat']

const useCosmosStore = create((set, get) => ({
  // Loading state
  loadingComplete: false,
  loadedSources: {},
  loadingProgress: 0,
  _markLoaded: (source) => {
    const current = { ...get().loadedSources, [source]: true }
    const loaded = REQUIRED_DATA.filter(k => current[k]).length
    const progress = Math.round((loaded / REQUIRED_DATA.length) * 100)
    set({
      loadedSources: current,
      loadingProgress: progress,
      loadingComplete: loaded >= REQUIRED_DATA.length,
    })
  },

  // Connection
  connected: false,
  setConnected: (v) => set({ connected: v }),

  // Satellites
  satellites: [],
  satelliteCount: 0,
  satelliteGroups: {},

  // Debris
  debrisObjects: [],
  debrisCount: 0,
  debrisByRisk: {},
  collisionWarnings: [],

  // Solar
  solarData: {},

  // ISS
  issData: {},

  // Asteroids
  asteroids: [],
  hazardousCount: 0,

  // Launches
  launches: [],
  nextLaunch: null,
  inFlightLaunches: [],
  launchPads: [],

  // Orbit predictions
  orbitPredictions: [],

  // Radiation
  radiationData: {},

  // AI
  aiAnalysis: {},
  aiThreatLevel: { score: 0, level: 0, label: 'YUKLANMOQDA...', color: '#333' },
  aiReport: '',
  aiInsights: [],
  threatHistory: [],

  // Alerts
  alerts: [],
  alertStats: {},

  // Agent statuses
  agentStatuses: {},

  // UI state
  selectedView: 'globe',
  selectedPanel: null,
  showChat: false,
  show3DLabels: true,

  // Actions
  setView: (view) => set({ selectedView: view }),
  setPanel: (panel) => set({ selectedPanel: panel }),
  toggleChat: () => set((s) => ({ showChat: !s.showChat })),

  // WebSocket event handler
  handleEvent: (event) => {
    const { type, data } = event

    switch (type) {
      case 'satellite_batch':
        set({
          satellites: data.satellites || [],
          satelliteCount: data.total_count || 0,
          satelliteGroups: data.group_counts || {},
        })
        get()._markLoaded('satellites')
        break

      case 'debris_update':
        set({
          debrisObjects: data.debris_objects || [],
          debrisCount: data.total_count || 0,
          debrisByRisk: data.by_risk || {},
        })
        get()._markLoaded('debris')
        break

      case 'collision_warning':
        set((s) => ({
          collisionWarnings: [data.conjunction, ...s.collisionWarnings].slice(0, 20),
        }))
        break

      case 'solar_weather':
        set({ solarData: data })
        get()._markLoaded('solar')
        break

      case 'iss_position':
        set({ issData: data })
        get()._markLoaded('iss')
        break

      case 'asteroid_update':
        set({
          asteroids: data.asteroids || [],
          hazardousCount: data.hazardous_count || 0,
        })
        get()._markLoaded('asteroids')
        break

      case 'launch_update':
        set({
          launches: data.launches || [],
          nextLaunch: data.next_launch,
          inFlightLaunches: data.in_flight || [],
          launchPads: data.launch_pads || [],
        })
        get()._markLoaded('launches')
        break

      case 'orbit_prediction':
        set({ orbitPredictions: data.predictions || [] })
        break

      case 'radiation_update':
        set({ radiationData: data })
        get()._markLoaded('radiation')
        break

      case 'ai_analysis':
        set({
          aiAnalysis: data.analysis || {},
          aiInsights: data.insights || [],
        })
        break

      case 'ai_threat_level':
        set({
          aiThreatLevel: data.overall || get().aiThreatLevel,
          threatHistory: data.history || [],
        })
        get()._markLoaded('ai_threat')
        break

      case 'ai_report':
        set({ aiReport: data.report || '' })
        break

      case 'alert':
        set({
          alerts: data.active_alerts || [],
          alertStats: data.by_severity || {},
        })
        break

      case 'agent_status':
        set((s) => ({
          agentStatuses: {
            ...s.agentStatuses,
            [data.agent]: data,
          },
        }))
        break

      case 'initial_state':
        if (data.agents) set({ agentStatuses: data.agents })
        break
    }
  },
}))

export default useCosmosStore
