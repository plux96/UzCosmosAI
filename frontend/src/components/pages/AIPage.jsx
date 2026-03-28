import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts'
import useCosmosStore from '../../stores/useCosmosStore'

export default function AIPage() {
  const analysis = useCosmosStore((s) => s.aiAnalysis)
  const threat = useCosmosStore((s) => s.aiThreatLevel)
  const insights = useCosmosStore((s) => s.aiInsights)
  const report = useCosmosStore((s) => s.aiReport)
  const history = useCosmosStore((s) => s.threatHistory)
  const agents = useCosmosStore((s) => s.agentStatuses)

  const chartData = history.slice(-60).map((h, i) => ({ i, score: h.score }))
  const breakdown = analysis.threat_breakdown || {}

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-lg tracking-wider text-green-400">AI TAHLIL MARKAZI</h1>
          <p className="text-[10px] opacity-40 mt-1">AI Brain Commander — barcha agentlar tahlili</p>
        </div>
        <motion.div className="text-center px-4 py-2 rounded-lg" style={{ background: `${threat.color}12`, border: `1px solid ${threat.color}30` }}
          animate={{ boxShadow: [`0 0 10px ${threat.color}22`, `0 0 25px ${threat.color}44`] }}
          transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}>
          <div className="text-3xl font-orbitron font-bold" style={{ color: threat.color }}>{threat.score}</div>
          <div className="text-[9px] font-orbitron tracking-wider" style={{ color: threat.color }}>{threat.label}</div>
        </motion.div>
      </div>

      {/* Threat trend */}
      <div className="panel p-4">
        <div className="panel-header mb-3 p-0 border-0"><span className="dot" /> Xavf darajasi trendi</div>
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <YAxis domain={[0, 100]} hide />
              <Line type="monotone" dataKey="score" stroke={threat.color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Threat breakdown */}
        <div className="panel p-4">
          <div className="panel-header mb-3 p-0 border-0"><span className="dot" /> Xavf taqsimoti</div>
          <div className="space-y-3">
            {[
              { key: 'debris', label: 'Kosmik axlat', color: '#ff4444' },
              { key: 'solar', label: 'Quyosh faoliyati', color: '#ffaa00' },
              { key: 'asteroid', label: 'Asteroidlar', color: '#ff6600' },
              { key: 'radiation', label: 'Radiatsiya', color: '#ff00aa' },
              { key: 'orbit_decay', label: 'Orbit degradatsiya', color: '#8855ff' },
            ].map((item, i) => {
              const val = breakdown[item.key] || 0
              return (
                <div key={i}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="opacity-60">{item.label}</span>
                    <span className="font-mono" style={{ color: item.color }}>{val.toFixed(1)}/100</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div className="h-full rounded-full" style={{ background: item.color, opacity: 0.7 }}
                      animate={{ width: `${val}%` }} transition={{ duration: 1 }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* AI Insights */}
        <div className="panel p-4">
          <div className="panel-header mb-3 p-0 border-0"><span className="dot" style={{ background: '#00ffaa' }} /> AI xulosalar</div>
          <div className="space-y-2">
            {insights.length > 0 ? insights.map((insight, i) => (
              <motion.div key={i} className="p-2.5 rounded" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                style={{ background: insight.type === 'alert' ? 'rgba(255,0,0,0.08)' : insight.type === 'warning' ? 'rgba(255,170,0,0.06)' : 'rgba(0,255,255,0.04)',
                  borderLeft: `3px solid ${insight.type === 'alert' ? '#ff0000' : insight.type === 'warning' ? '#ffaa00' : '#00ffff'}` }}>
                <div className="text-[11px] font-medium text-white">{insight.title}</div>
                <div className="text-[9px] opacity-50 mt-0.5">{insight.detail}</div>
              </motion.div>
            )) : <div className="text-center opacity-30 py-6 text-[10px]">Tahlil davom etmoqda...</div>}
          </div>
        </div>
      </div>

      {/* Agents status */}
      <div className="panel p-4">
        <div className="panel-header mb-3 p-0 border-0"><span className="dot" /> Agent holatlari ({Object.keys(agents).length}/10)</div>
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(agents).map(([name, info], i) => (
            <motion.div key={name} className="p-2 rounded text-center text-[9px]"
              style={{ background: info.status === 'running' ? 'rgba(0,255,136,0.04)' : 'rgba(255,0,0,0.08)',
                border: `1px solid ${info.status === 'running' ? 'rgba(0,255,136,0.15)' : 'rgba(255,0,0,0.2)'}` }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}>
              <div className={`status-dot ${info.status === 'running' ? 'online' : 'error'} mx-auto mb-1`} />
              <div className="font-medium truncate">{name.replace(/_/g, ' ')}</div>
              <div className="font-mono opacity-40">{info.success_count || 0} cycles</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Full report */}
      <div className="panel p-4">
        <div className="panel-header mb-3 p-0 border-0"><span className="dot" /> To'liq hisobot</div>
        <pre className="text-[10px] opacity-60 whitespace-pre-wrap font-mono leading-relaxed">{report || 'Hisobot tayyorlanmoqda...'}</pre>
      </div>
    </div>
  )
}
