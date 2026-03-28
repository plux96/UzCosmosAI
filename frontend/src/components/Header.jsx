import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import useCosmosStore from '../stores/useCosmosStore'

export default function Header() {
  const connected = useCosmosStore((s) => s.connected)
  const threat = useCosmosStore((s) => s.aiThreatLevel)
  const agentStatuses = useCosmosStore((s) => s.agentStatuses)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const onlineAgents = Object.values(agentStatuses).filter(
    (a) => a.status === 'running'
  ).length

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-10 flex items-center px-4 gap-4"
      style={{
        background: 'rgba(5,5,16,0.85)',
        borderBottom: '1px solid rgba(0,255,136,0.1)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: connected ? '#00ff88' : '#ff4444' }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span className="font-orbitron text-sm tracking-[0.2em] text-glow"
          style={{ color: '#00ff88' }}>
          UZCOSMOS
        </span>
        <span className="font-orbitron text-[10px] tracking-wider opacity-40">
          AI
        </span>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-white opacity-10" />

      {/* Threat indicator */}
      <motion.div
        className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-orbitron"
        style={{
          background: `${threat.color}10`,
          border: `1px solid ${threat.color}30`,
          color: threat.color,
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: threat.color }} />
        {threat.label}
        <span className="opacity-50">{threat.score}</span>
      </motion.div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Agent count */}
      <div className="text-[9px] opacity-40 font-orbitron tracking-wider">
        AGENTS: <span className={onlineAgents >= 8 ? 'text-green-400' : 'text-yellow-400'}>
          {onlineAgents}
        </span>/10
      </div>

      {/* Time */}
      <div className="text-[10px] font-mono opacity-60">
        <span className="opacity-40">UTC </span>
        {time.toISOString().slice(11, 19)}
      </div>

      {/* Connection status */}
      <div className="text-[8px] font-orbitron tracking-wider">
        {connected ? (
          <span className="text-green-400">ONLINE</span>
        ) : (
          <motion.span
            className="text-red-400"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            OFFLINE
          </motion.span>
        )}
      </div>
    </header>
  )
}
