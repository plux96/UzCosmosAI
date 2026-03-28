import { useRef, useMemo, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useCosmosStore from '../../stores/useCosmosStore'

const EARTH_RADIUS = 2
const SCALE = EARTH_RADIUS / 6371

function latLonToVec3(lat, lon, alt = 0) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  const r = EARTH_RADIUS + alt * SCALE
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  )
}

/**
 * Create satellite icon sprite textures procedurally.
 * Different shapes for different satellite types.
 */
function createSatelliteTexture(type = 'default', color = '#00ff88') {
  const size = 64
  const c = document.createElement('canvas')
  c.width = size; c.height = size
  const ctx = c.getContext('2d')
  const cx = size / 2, cy = size / 2

  // Glow
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2)
  glow.addColorStop(0, color + '66')
  glow.addColorStop(0.4, color + '22')
  glow.addColorStop(1, 'transparent')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 1.5
  ctx.shadowColor = color
  ctx.shadowBlur = 4

  switch (type) {
    case 'stations':
      // Space station — cross with panels
      ctx.fillRect(cx - 12, cy - 2, 24, 4) // body
      ctx.fillRect(cx - 2, cy - 14, 4, 28) // solar panels vertical
      ctx.fillRect(cx - 8, cy - 12, 16, 3)  // top panel
      ctx.fillRect(cx - 8, cy + 9, 16, 3)   // bottom panel
      break

    case 'gps-ops':
    case 'galileo':
      // Navigation sat — diamond with panels
      ctx.beginPath()
      ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 6, cy)
      ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 6, cy)
      ctx.closePath(); ctx.fill()
      ctx.fillRect(cx - 14, cy - 2, 8, 4) // left panel
      ctx.fillRect(cx + 6, cy - 2, 8, 4)  // right panel
      break

    case 'weather':
    case 'resource':
      // Earth observation — rectangle with antenna
      ctx.fillRect(cx - 5, cy - 4, 10, 8) // body
      ctx.fillRect(cx - 12, cy - 2, 6, 4) // left panel
      ctx.fillRect(cx + 5, cy - 2, 6, 4)  // right panel
      ctx.fillRect(cx - 1, cy - 10, 2, 6) // antenna
      ctx.beginPath(); ctx.arc(cx, cy - 11, 3, 0, Math.PI * 2); ctx.stroke() // dish
      break

    case 'science':
      // Science sat — hexagon with instruments
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i * 60 - 30) * Math.PI / 180
        const px = cx + 7 * Math.cos(a), py = cy + 7 * Math.sin(a)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath(); ctx.fill()
      ctx.fillRect(cx - 15, cy - 1.5, 10, 3) // boom left
      ctx.fillRect(cx + 5, cy - 1.5, 10, 3)  // boom right
      break

    case 'military':
      // Military — stealth diamond
      ctx.globalAlpha = 0.9
      ctx.beginPath()
      ctx.moveTo(cx, cy - 10); ctx.lineTo(cx + 8, cy)
      ctx.lineTo(cx, cy + 4); ctx.lineTo(cx - 8, cy)
      ctx.closePath(); ctx.fill()
      ctx.fillRect(cx - 3, cy - 3, 6, 2) // sensor bar
      break

    case 'geo':
      // Geostationary — large with big panels
      ctx.fillRect(cx - 4, cy - 5, 8, 10) // body
      ctx.fillRect(cx - 16, cy - 3, 12, 6) // left panel
      ctx.fillRect(cx + 4, cy - 3, 12, 6)  // right panel
      // Panel lines
      ctx.strokeStyle = color + '88'; ctx.lineWidth = 0.5
      for (let x = cx - 14; x < cx - 4; x += 3) {
        ctx.beginPath(); ctx.moveTo(x, cy - 2); ctx.lineTo(x, cy + 2); ctx.stroke()
      }
      for (let x = cx + 6; x < cx + 16; x += 3) {
        ctx.beginPath(); ctx.moveTo(x, cy - 2); ctx.lineTo(x, cy + 2); ctx.stroke()
      }
      ctx.fillStyle = color; ctx.fillRect(cx - 1, cy - 9, 2, 4) // antenna
      break

    case 'last-30-days':
    case 'visual':
      // Modern sat — sleek body + panels
      ctx.fillRect(cx - 3, cy - 6, 6, 12) // body
      ctx.fillRect(cx - 13, cy - 2, 10, 4) // panel L
      ctx.fillRect(cx + 3, cy - 2, 10, 4)  // panel R
      break

    default:
      // Generic satellite — body + solar panels
      ctx.fillRect(cx - 3, cy - 3, 6, 6)    // body
      ctx.fillRect(cx - 12, cy - 1.5, 8, 3) // panel L
      ctx.fillRect(cx + 4, cy - 1.5, 8, 3)  // panel R
      break
  }

  const tex = new THREE.CanvasTexture(c)
  tex.needsUpdate = true
  return tex
}

// Pre-create textures for each group
const GROUP_COLORS = {
  stations: '#00ffff', active: '#00ff88', 'last-30-days': '#aaffcc',
  'gps-ops': '#ffaa00', galileo: '#4488ff', weather: '#88ff00',
  resource: '#ff8800', science: '#ff44ff', military: '#ff2244',
  geo: '#ffff44', visual: '#44ffaa',
}

/**
 * Renders satellites as sprite billboards with different icons per type
 */
export default function SatelliteSprites() {
  const satellites = useCosmosStore((s) => s.satellites)
  const [selected, setSelected] = useState(null)
  const { camera, raycaster, pointer } = useThree()

  // Group satellites by type and create instanced sprites per group
  const groups = useMemo(() => {
    const map = {}
    satellites.forEach(sat => {
      const g = sat.group || 'active'
      if (!map[g]) map[g] = []
      map[g].push(sat)
    })
    return map
  }, [satellites])

  // Textures cache
  const textures = useMemo(() => {
    const t = {}
    Object.keys(GROUP_COLORS).forEach(g => {
      t[g] = createSatelliteTexture(g, GROUP_COLORS[g] || '#00ff88')
    })
    return t
  }, [])

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    raycaster.setFromCamera(pointer, camera)

    let closest = null, closestDist = 0.12
    satellites.forEach(sat => {
      const v = latLonToVec3(sat.lat, sat.lon, sat.alt)
      const d = raycaster.ray.distanceToPoint(v)
      if (d < closestDist) { closestDist = d; closest = sat }
    })
    setSelected(closest)
  }, [satellites, camera, raycaster, pointer])

  return (
    <group onClick={handleClick}>
      {Object.entries(groups).map(([groupName, sats]) => (
        <SatelliteGroup
          key={groupName}
          satellites={sats}
          texture={textures[groupName] || textures['active']}
          color={GROUP_COLORS[groupName] || '#00ff88'}
        />
      ))}

      {selected && <SatPopup sat={selected} onClose={() => setSelected(null)} />}
    </group>
  )
}

/** Single group of satellites rendered as instanced sprites */
function SatelliteGroup({ satellites, texture, color }) {
  const meshRef = useRef()

  const { matrices, count } = useMemo(() => {
    const dummy = new THREE.Object3D()
    const m = []

    satellites.forEach(sat => {
      const pos = latLonToVec3(sat.lat, sat.lon, sat.alt)
      dummy.position.copy(pos)
      dummy.lookAt(0, 0, 0) // face Earth center
      dummy.rotateY(Math.PI) // face outward
      dummy.scale.setScalar(0.025 + (sat.size || 1) * 0.005)
      dummy.updateMatrix()
      m.push(dummy.matrix.clone())
    })

    return { matrices: m, count: satellites.length }
  }, [satellites])

  // Apply matrices
  useMemo(() => {
    if (meshRef.current && matrices.length > 0) {
      matrices.forEach((mat, i) => {
        meshRef.current.setMatrixAt(i, mat)
      })
      meshRef.current.instanceMatrix.needsUpdate = true
    }
  }, [matrices])

  if (count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.9}
        depthWrite={false}
        side={THREE.DoubleSide}
        color={color}
      />
    </instancedMesh>
  )
}

/** Popup when satellite is clicked */
function SatPopup({ sat, onClose }) {
  const pos = latLonToVec3(sat.lat, sat.lon, sat.alt)
  const ref = useRef()

  useFrame((s) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(s.clock.elapsedTime * 4) * 0.25)
  })

  const groupLabel = {
    stations: 'Kosmik stansiya', active: 'Faol yo\'ldosh', 'last-30-days': 'Yangi uchirilgan',
    'gps-ops': 'GPS navigatsiya', galileo: 'Galileo nav.', weather: 'Ob-havo',
    resource: 'Yer resurslari', science: 'Ilmiy', military: 'Harbiy',
    geo: 'Geostatsionar', visual: 'Ko\'zga ko\'rinadi',
  }[sat.group] || sat.group

  return (
    <group position={pos}>
      <mesh ref={ref}>
        <ringGeometry args={[0.02, 0.028, 24]} />
        <meshBasicMaterial color={sat.color || '#00ff88'} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={sat.color || '#00ff88'} intensity={1.2} distance={0.5} />

      <Html distanceFactor={5} style={{ pointerEvents: 'auto' }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: 'rgba(3,6,15,0.97)',
          border: `1px solid ${sat.color || '#00ff88'}35`,
          borderRadius: 8, padding: '10px 14px', minWidth: 230,
          fontFamily: 'JetBrains Mono, monospace',
          backdropFilter: 'blur(16px)',
          boxShadow: `0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 ${sat.color || '#00ff88'}10`,
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
            <div>
              <div style={{ color: sat.color || '#00ff88', fontSize: 11, fontFamily: 'Orbitron', letterSpacing: '0.1em', fontWeight: 700 }}>
                {sat.name}
              </div>
              <div style={{ fontSize: 8, color: '#555', marginTop: 2 }}>{groupLabel}</div>
            </div>
            <span onClick={onClose} style={{
              color: '#444', cursor: 'pointer', fontSize: 11, width: 18, height: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 4, border: '1px solid #222',
            }}>x</span>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {[
              ['NORAD ID', sat.id, '#888'],
              ['Balandlik', `${sat.alt?.toFixed(1)} km`, '#00ffff'],
              ['Tezlik', `${sat.velocity?.toFixed(2)} km/s`, '#00ff88'],
              ['Inklinatsiya', `${sat.inclination?.toFixed(1)}°`, '#ffaa00'],
              ['Kenglik', `${sat.lat?.toFixed(4)}°`, '#aaa'],
              ['Uzunlik', `${sat.lon?.toFixed(4)}°`, '#aaa'],
              ['Davr', `${sat.period?.toFixed(1)} min`, '#ff88ff'],
              ['Tezlik', `${((sat.velocity || 0) * 3600).toFixed(0)} km/h`, '#44aaff'],
            ].map(([label, value, valColor], i) => (
              <div key={i} style={{ padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 7, color: '#444', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: 10, color: valColor, fontWeight: 600 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      </Html>
    </group>
  )
}
