import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useCosmosStore from '../stores/useCosmosStore'

const DATA_LABELS = {
  satellites: { label: 'Sun\'iy yo\'ldoshlar', icon: 'SAT' },
  debris: { label: 'Kosmik axlat', icon: 'DEB' },
  solar: { label: 'Quyosh faoliyati', icon: 'SOL' },
  iss: { label: 'ISS pozitsiyasi', icon: 'ISS' },
  asteroids: { label: 'Asteroidlar', icon: 'AST' },
  launches: { label: 'Raketa uchirishlari', icon: 'LCH' },
  radiation: { label: 'Radiatsiya', icon: 'RAD' },
  ai_threat: { label: 'AI tahlil', icon: 'AI' },
}

export default function LoadingScreen() {
  const loadingComplete = useCosmosStore((s) => s.loadingComplete)
  const loadedSources = useCosmosStore((s) => s.loadedSources)
  const loadingProgress = useCosmosStore((s) => s.loadingProgress)
  const connected = useCosmosStore((s) => s.connected)
  const [dots, setDots] = useState('')
  const [showMain, setShowMain] = useState(false)

  // Animated dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500)
    return () => clearInterval(t)
  }, [])

  // Delay hiding loading screen for smooth transition
  useEffect(() => {
    if (loadingComplete) {
      const t = setTimeout(() => setShowMain(true), 800)
      return () => clearTimeout(t)
    }
  }, [loadingComplete])

  if (showMain) return null

  return (
    <AnimatePresence>
      {!showMain && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: '#020206' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Background grid */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(0,255,136,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,136,1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

          {/* Scanning line */}
          <motion.div className="absolute left-0 right-0 h-[1px]"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,255,136,0.15), transparent)' }}
            animate={{ top: ['0%', '100%'] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <div className="font-orbitron text-3xl tracking-[0.4em] text-green-400 text-glow">
              UZCOSMOS
            </div>
            <div className="font-orbitron text-xs tracking-[0.6em] text-green-400/30 text-center mt-1">
              AI MISSION CONTROL
            </div>
          </motion.div>

          {/* Connection status */}
          <motion.div
            className="flex items-center gap-2 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <motion.div
              className="w-2 h-2 rounded-full"
              style={{ background: connected ? '#00ff88' : '#ff4444' }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[10px] font-mono" style={{ color: connected ? '#00ff88' : '#ff4444' }}>
              {connected ? 'SERVERGA ULANDI' : `ULANMOQDA${dots}`}
            </span>
          </motion.div>

          {/* Progress bar */}
          <div className="w-[340px] mb-6">
            <div className="flex justify-between text-[9px] font-mono mb-1.5">
              <span className="text-green-400/50">MA'LUMOTLAR YUKLANMOQDA</span>
              <span className="text-green-400 font-bold">{loadingProgress}%</span>
            </div>
            <div className="h-[3px] rounded-full" style={{ background: 'rgba(0,255,136,0.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, #00ff88, #00ffcc)' }}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Data sources checklist */}
          <div className="w-[340px] space-y-1">
            {Object.entries(DATA_LABELS).map(([key, info], i) => {
              const loaded = loadedSources[key]
              return (
                <motion.div
                  key={key}
                  className="flex items-center gap-3 py-1 px-2 rounded"
                  style={{
                    background: loaded ? 'rgba(0,255,136,0.04)' : 'transparent',
                    border: `1px solid ${loaded ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.03)'}`,
                  }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                >
                  {/* Status icon */}
                  <div className="w-4 flex justify-center">
                    {loaded ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-green-400"
                        style={{ boxShadow: '0 0 6px rgba(0,255,136,0.5)' }}
                      />
                    ) : connected ? (
                      <motion.div
                        className="w-2 h-2 rounded-full border border-green-400/30"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    ) : (
                      <div className="w-2 h-2 rounded-full border border-white/10" />
                    )}
                  </div>

                  {/* Label */}
                  <span className="text-[9px] font-mono w-6 text-center" style={{ color: loaded ? '#00ff88' : '#333' }}>
                    {info.icon}
                  </span>
                  <span className="text-[10px] flex-1" style={{ color: loaded ? '#00ff88' : '#444' }}>
                    {info.label}
                  </span>

                  {/* Status text */}
                  <span className="text-[8px] font-mono" style={{ color: loaded ? '#00ff8866' : '#333' }}>
                    {loaded ? 'OK' : connected ? `yuklanmoqda${dots}` : 'kutilmoqda'}
                  </span>
                </motion.div>
              )
            })}
          </div>

          {/* Status message */}
          <motion.div
            className="mt-6 text-[9px] font-mono text-center"
            style={{ color: loadingComplete ? '#00ff88' : '#333' }}
            animate={loadingComplete ? { opacity: [0.5, 1, 0.5] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {loadingComplete
              ? 'BARCHA TIZIMLAR TAYYOR — ISHGA TUSHIRILMOQDA...'
              : connected
                ? `10 TA AGENT API LARDAN MA'LUMOT YUKLAMOQDA${dots}`
                : `BACKEND SERVERGA ULANISH KUTILMOQDA${dots}`
            }
          </motion.div>

          {/* Bottom branding */}
          <div className="absolute bottom-4 text-[8px] font-mono text-white/10 tracking-widest">
            KOSMIK ROBOTOTEXNIKA YO'NALISHIDA "YOSH MUHANDIS" LOYIHASI
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
