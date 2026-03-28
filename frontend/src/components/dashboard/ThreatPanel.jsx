import { motion } from 'framer-motion'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import useCosmosStore from '../../stores/useCosmosStore'

export default function ThreatPanel() {
  const threat = useCosmosStore((s) => s.aiThreatLevel)
  const history = useCosmosStore((s) => s.threatHistory)
  const insights = useCosmosStore((s) => s.aiInsights)

  const chartData = history.slice(-30).map((h, i) => ({ i, score: h.score }))

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="dot" style={{ background: threat.color }} />
        AI Xavf Tahlili
      </div>
      <div className="p-3">
        {/* Threat meter */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-[10px] opacity-50">Umumiy xavf darajasi</span>
              <motion.span
                className="text-sm font-bold font-orbitron"
                style={{ color: threat.color }}
                key={threat.score}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
              >
                {threat.score}/100
              </motion.span>
            </div>
            <div className="threat-meter">
              <motion.div
                className="threat-meter-fill"
                style={{ background: threat.color }}
                animate={{ width: `${threat.score}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
          <motion.div
            className="text-center px-3 py-1 rounded"
            style={{
              background: `${threat.color}15`,
              border: `1px solid ${threat.color}40`,
              color: threat.color,
            }}
            animate={{
              boxShadow: threat.score > 50
                ? [`0 0 10px ${threat.color}40`, `0 0 20px ${threat.color}20`]
                : 'none',
            }}
            transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
          >
            <div className="text-[9px] font-orbitron tracking-wider">
              {threat.label}
            </div>
          </motion.div>
        </div>

        {/* Mini trend chart */}
        {chartData.length > 2 && (
          <div className="h-[40px] mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <YAxis domain={[0, 100]} hide />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={threat.color}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* AI Insights */}
        <div className="space-y-1.5">
          {insights.slice(0, 4).map((insight, i) => (
            <motion.div
              key={i}
              className="flex items-start gap-2 p-1.5 rounded text-[10px]"
              style={{
                background: insight.type === 'alert' ? 'rgba(255,0,0,0.1)' :
                  insight.type === 'warning' ? 'rgba(255,170,0,0.1)' :
                    'rgba(0,255,255,0.05)',
                borderLeft: `2px solid ${
                  insight.type === 'alert' ? '#ff0000' :
                    insight.type === 'warning' ? '#ffaa00' : '#00ffff'
                }`,
              }}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div>
                <div className="font-medium text-white">{insight.title}</div>
                <div className="opacity-50 mt-0.5">{insight.detail}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
