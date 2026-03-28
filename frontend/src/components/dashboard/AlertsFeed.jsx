import { motion, AnimatePresence } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

const SEVERITY_STYLES = {
  critical: { bg: 'rgba(255,0,0,0.1)', border: '#ff0000', text: '#ff4444' },
  warning: { bg: 'rgba(255,170,0,0.1)', border: '#ffaa00', text: '#ffcc44' },
  info: { bg: 'rgba(0,255,255,0.05)', border: '#00ffff', text: '#44ddff' },
}

export default function AlertsFeed() {
  const alerts = useCosmosStore((s) => s.alerts)
  const alertStats = useCosmosStore((s) => s.alertStats)

  return (
    <div className="panel max-h-[280px] flex flex-col">
      <div className="panel-header justify-between">
        <div className="flex items-center gap-2">
          <span className="dot" style={{
            background: (alertStats.critical || 0) > 0 ? '#ff0000' : '#00ff88'
          }} />
          Ogohlantirish ({alerts.length})
        </div>
        <div className="flex gap-2 text-[8px]">
          {alertStats.critical > 0 && (
            <span style={{ color: '#ff4444' }}>{alertStats.critical} KRITIK</span>
          )}
          {alertStats.warning > 0 && (
            <span style={{ color: '#ffaa00' }}>{alertStats.warning} XAVF</span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        <AnimatePresence mode="popLayout">
          {alerts.slice(0, 10).map((alert, i) => {
            const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info
            return (
              <motion.div
                key={alert.id}
                className="p-2 rounded text-[10px]"
                style={{
                  background: style.bg,
                  borderLeft: `3px solid ${style.border}`,
                }}
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-start">
                  <span className="font-medium" style={{ color: style.text }}>
                    {alert.title}
                  </span>
                  <span className="text-[8px] opacity-30">
                    {new Date(alert.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="opacity-50 mt-0.5 text-[9px]">{alert.message}</div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {alerts.length === 0 && (
          <div className="text-center text-[10px] opacity-30 py-4">
            Hozircha ogohlantirish yo'q
          </div>
        )}
      </div>
    </div>
  )
}
