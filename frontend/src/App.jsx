import { Component } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useWebSocket from './hooks/useWebSocket'
import useCosmosStore from './stores/useCosmosStore'
import LoadingScreen from './components/LoadingScreen'
import Header from './components/Header'
import Sidebar from './components/Sidebar'

// Pages
import GlobePage from './components/pages/GlobePage'
import SatellitesPage from './components/pages/SatellitesPage'
import DebrisPage from './components/pages/DebrisPage'
import LaunchesPage from './components/pages/LaunchesPage'
import ISSPage from './components/pages/ISSPage'
import SolarPage from './components/pages/SolarPage'
import AsteroidsPage from './components/pages/AsteroidsPage'
import RadiationPage from './components/pages/RadiationPage'
import AIPage from './components/pages/AIPage'
import AlertsPage from './components/pages/AlertsPage'

const PAGES = {
  globe: GlobePage,
  satellites: SatellitesPage,
  debris: DebrisPage,
  launches: LaunchesPage,
  iss: ISSPage,
  solar: SolarPage,
  asteroids: AsteroidsPage,
  radiation: RadiationPage,
  ai: AIPage,
  alerts: AlertsPage,
}

class ErrorBoundary extends Component {
  state = { hasError: false, error: null }
  static getDerivedStateFromError(error) { return { hasError: true, error } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center flex-col gap-3">
          <div className="font-orbitron text-red-400 text-sm tracking-widest">XATOLIK</div>
          <div className="text-[10px] opacity-40 max-w-lg text-center">{String(this.state.error)}</div>
          <button onClick={() => this.setState({ hasError: false })}
            className="px-4 py-1.5 text-xs border border-green-800 text-green-400 rounded hover:bg-green-900/30 font-orbitron tracking-wider">
            QAYTA URINISH
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  useWebSocket()
  const selectedView = useCosmosStore((s) => s.selectedView)
  const PageComponent = PAGES[selectedView] || GlobePage

  return (
    <div className="w-screen h-screen overflow-hidden bg-space-deeper relative">
      {/* Loading screen — hides after all APIs respond */}
      <LoadingScreen />

      {/* Grid overlay */}
      <div className="grid-overlay" />

      {/* Header */}
      <Header />

      {/* Main layout: Sidebar + Content */}
      <div className="pt-10 h-full flex">
        {/* Sidebar navigation */}
        <Sidebar />

        {/* Page content */}
        <main className="flex-1 min-w-0 h-[calc(100vh-40px)] overflow-hidden"
          style={{ background: 'rgba(5,5,16,0.3)' }}>
          <ErrorBoundary key={selectedView}>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedView}
                className="w-full h-full"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                <PageComponent />
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>

      {/* Corner decorations */}
      {[
        { top: 0, left: 0, borderTop: '2px solid rgba(0,255,136,0.2)', borderLeft: '2px solid rgba(0,255,136,0.2)' },
        { top: 0, right: 0, borderTop: '2px solid rgba(0,255,136,0.2)', borderRight: '2px solid rgba(0,255,136,0.2)' },
        { bottom: 0, left: 0, borderBottom: '2px solid rgba(0,255,136,0.2)', borderLeft: '2px solid rgba(0,255,136,0.2)' },
        { bottom: 0, right: 0, borderBottom: '2px solid rgba(0,255,136,0.2)', borderRight: '2px solid rgba(0,255,136,0.2)' },
      ].map((style, i) => (
        <div key={i} style={{ position: 'fixed', width: 20, height: 20, pointerEvents: 'none', zIndex: 100, ...style }} />
      ))}
    </div>
  )
}
