import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'
import useCosmosStore from '../../stores/useCosmosStore'

const GROUP_COLORS = {
  stations: '#00ffff', active: '#00ff88', starlink: '#ffffff',
  'gps-ops': '#ffaa00', galileo: '#0088ff', weather: '#88ff00',
  resource: '#ff8800', science: '#ff00ff', military: '#ff0044', geo: '#ffff00',
}
const GROUP_NAMES = {
  stations: 'Stansiyalar', active: 'Faol', starlink: 'Starlink',
  'gps-ops': 'GPS', galileo: 'Galileo', weather: 'Ob-havo',
  resource: 'Resurs', science: 'Ilmiy', military: 'Harbiy', geo: 'Geostatsionar',
}

export default function SatellitesPage() {
  const satellites = useCosmosStore((s) => s.satellites)
  const satelliteCount = useCosmosStore((s) => s.satelliteCount)
  const groups = useCosmosStore((s) => s.satelliteGroups)

  const pieData = Object.entries(groups).map(([key, count]) => ({
    name: GROUP_NAMES[key] || key,
    value: count,
    color: GROUP_COLORS[key] || '#666',
  })).sort((a, b) => b.value - a.value)

  const barData = pieData.slice(0, 8)

  // Altitude distribution
  const altBuckets = { 'LEO (0-2000)': 0, 'MEO (2000-20000)': 0, 'GEO (35000+)': 0, 'Boshqa': 0 }
  satellites.forEach(s => {
    if (s.alt < 2000) altBuckets['LEO (0-2000)']++
    else if (s.alt < 20000) altBuckets['MEO (2000-20000)']++
    else if (s.alt > 33000) altBuckets['GEO (35000+)']++
    else altBuckets['Boshqa']++
  })
  const altData = Object.entries(altBuckets).map(([name, value]) => ({ name, value }))

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-orbitron text-lg tracking-wider text-green-400">YO'LDOSHLAR MONITORING</h1>
          <p className="text-[10px] opacity-40 mt-1">Real-time sun'iy yo'ldoshlarni kuzatish tizimi</p>
        </div>
        <motion.div
          className="text-3xl font-orbitron font-bold text-green-400"
          key={satelliteCount}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
        >
          {satelliteCount.toLocaleString()}
          <span className="text-sm opacity-40 ml-2">ta yo'ldosh</span>
        </motion.div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Pie chart — guruhlar */}
        <div className="panel p-4 col-span-1">
          <div className="panel-header mb-3 p-0 border-0">
            <span className="dot" /> Guruhlar bo'yicha
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.8} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0a1628', border: '1px solid rgba(0,255,136,0.2)', fontSize: 11 }}
                  labelStyle={{ color: '#00ff88' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[9px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                  <span className="opacity-60">{item.name}</span>
                </div>
                <span className="font-mono" style={{ color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div className="panel p-4 col-span-1">
          <div className="panel-header mb-3 p-0 border-0">
            <span className="dot" /> Miqdor bo'yicha
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" tick={{ fill: '#888', fontSize: 9 }} width={55} />
                <Tooltip contentStyle={{ background: '#0a1628', border: '1px solid rgba(0,255,136,0.2)', fontSize: 11 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.7} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Altitude distribution */}
        <div className="panel p-4 col-span-1">
          <div className="panel-header mb-3 p-0 border-0">
            <span className="dot" /> Orbit bo'yicha
          </div>
          <div className="space-y-3 mt-4">
            {altData.map((item, i) => {
              const pct = satelliteCount > 0 ? (item.value / satelliteCount * 100) : 0
              const colors = ['#00ff88', '#0088ff', '#ffaa00', '#888']
              return (
                <div key={i}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="opacity-60">{item.name}</span>
                    <span className="font-mono" style={{ color: colors[i] }}>{item.value}</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: colors[i] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, delay: i * 0.2 }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-2 mt-6">
            {[
              { label: 'Eng past', value: satellites.length > 0 ? Math.min(...satellites.map(s => s.alt)).toFixed(0) : '—', unit: 'km', color: '#00ffff' },
              { label: 'Eng baland', value: satellites.length > 0 ? Math.max(...satellites.map(s => s.alt)).toFixed(0) : '—', unit: 'km', color: '#ffaa00' },
              { label: 'O\'rtacha tezlik', value: satellites.length > 0 ? (satellites.reduce((a, s) => a + (s.velocity || 0), 0) / satellites.length).toFixed(2) : '—', unit: 'km/s', color: '#00ff88' },
              { label: 'O\'zbekiston ustida', value: satellites.filter(s => s.lat >= 37 && s.lat <= 46 && s.lon >= 56 && s.lon <= 73).length, unit: 'ta', color: '#ff00ff' },
            ].map((stat, i) => (
              <div key={i} className="p-2 rounded text-center" style={{ background: 'rgba(0,0,0,0.3)' }}>
                <div className="text-[8px] opacity-40">{stat.label}</div>
                <div className="text-sm font-bold font-mono" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[8px] opacity-30">{stat.unit}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Satellite table */}
      <div className="panel p-4">
        <div className="panel-header mb-3 p-0 border-0">
          <span className="dot" /> Yo'ldoshlar ro'yxati (birinchi 50)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-left opacity-40 border-b border-white/5">
                <th className="pb-2 pr-4">Nomi</th>
                <th className="pb-2 pr-4">Guruh</th>
                <th className="pb-2 pr-4 text-right">Balandlik</th>
                <th className="pb-2 pr-4 text-right">Tezlik</th>
                <th className="pb-2 pr-4 text-right">Kenglik</th>
                <th className="pb-2 text-right">Uzunlik</th>
              </tr>
            </thead>
            <tbody>
              {satellites.slice(0, 50).map((sat, i) => (
                <motion.tr
                  key={sat.id || i}
                  className="border-b border-white/3 hover:bg-white/3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <td className="py-1.5 pr-4 font-medium text-white">{sat.name}</td>
                  <td className="py-1.5 pr-4">
                    <span className="px-1.5 py-0.5 rounded text-[8px]" style={{
                      background: `${GROUP_COLORS[sat.group] || '#666'}15`,
                      color: GROUP_COLORS[sat.group] || '#666',
                    }}>
                      {GROUP_NAMES[sat.group] || sat.group}
                    </span>
                  </td>
                  <td className="py-1.5 pr-4 text-right font-mono text-cyan-400">{sat.alt?.toFixed(0)} km</td>
                  <td className="py-1.5 pr-4 text-right font-mono text-green-400">{sat.velocity?.toFixed(2)} km/s</td>
                  <td className="py-1.5 pr-4 text-right font-mono opacity-60">{sat.lat?.toFixed(2)}</td>
                  <td className="py-1.5 text-right font-mono opacity-60">{sat.lon?.toFixed(2)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
