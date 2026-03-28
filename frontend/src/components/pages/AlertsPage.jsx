import { motion, AnimatePresence } from 'framer-motion'
import useCosmosStore from '../../stores/useCosmosStore'

const SEVERITY = {
  critical: { bg: 'rgba(255,0,0,0.08)', border: '#ff0000', text: '#ff4444', label: 'KRITIK' },
  warning: { bg: 'rgba(255,170,0,0.06)', border: '#ffaa00', text: '#ffcc44', label: 'XAVF' },
  info: { bg: 'rgba(0,255,255,0.04)', border: '#00ffff', text: '#44ddff', label: 'MA\'LUMOT' },
}

export default function AlertsPage() {
  const alerts = useCosmosStore((s) => s.alerts)
  const alertStats = useCosmosStore((s) => s.alertStats)

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-lg tracking-wider text-red-400">OGOHLANTIRISH MARKAZI</h1>
          <p className="text-[10px] opacity-40 mt-1">Barcha kosmik ogohlantirish va xavf signallari</p>
        </div>
        <div className="flex gap-3">
          {[
            { label: 'Kritik', value: alertStats.critical || 0, color: '#ff0000' },
            { label: 'Xavf', value: alertStats.warning || 0, color: '#ffaa00' },
            { label: 'Ma\'lumot', value: alertStats.info || 0, color: '#00ffff' },
          ].map((item, i) => (
            <div key={i} className="text-center px-2 py-1 rounded" style={{ background: `${item.color}10`, border: `1px solid ${item.color}20` }}>
              <div className="text-lg font-orbitron font-bold" style={{ color: item.color }}>{item.value}</div>
              <div className="text-[8px] opacity-40">{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {alerts.map((alert, i) => {
            const sev = SEVERITY[alert.severity] || SEVERITY.info
            return (
              <motion.div key={alert.id} className="panel p-3 flex gap-3"
                style={{ background: sev.bg, borderLeft: `3px solid ${sev.border}` }}
                initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}>
                {/* Severity badge */}
                <div className="flex-shrink-0 pt-0.5">
                  <motion.div className="w-3 h-3 rounded-full" style={{ background: sev.border }}
                    animate={alert.severity === 'critical' ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }} />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-medium" style={{ color: sev.text }}>{alert.title}</span>
                    <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: `${sev.border}20`, color: sev.text }}>{sev.label}</span>
                    <span className="text-[8px] opacity-25 px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>{alert.category}</span>
                  </div>
                  <div className="text-[10px] opacity-50">{alert.message}</div>
                </div>
                {/* Time */}
                <div className="text-[9px] opacity-30 whitespace-nowrap flex-shrink-0">
                  {new Date(alert.created_at).toLocaleTimeString()}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
        {alerts.length === 0 && (
          <div className="text-center py-16 opacity-30">
            <div className="text-4xl mb-3">---</div>
            <div className="font-orbitron text-sm tracking-wider">Hozircha ogohlantirish yo'q</div>
            <div className="text-[10px] mt-1">Tizim normal rejimda ishlayapti</div>
          </div>
        )}
      </div>
    </div>
  )
}
