import { useRef, useMemo, useState } from 'react'
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

/* ============================================================
   LAUNCH PAD MARKERS — pulsating dots on globe
   ============================================================ */
function LaunchPad({ pad }) {
  const ref = useRef()
  const pos = latLonToVec3(pad.lat, pad.lon, 5)
  const { camera } = useThree()
  const [dist, setDist] = useState(10)

  const color = pad.has_in_flight ? '#ff4400' : pad.has_upcoming ? '#ffaa00' : '#666666'

  useFrame((state) => {
    if (ref.current) {
      const pulse = pad.has_in_flight
        ? 1 + Math.sin(state.clock.elapsedTime * 6) * 0.5
        : pad.has_upcoming
          ? 1 + Math.sin(state.clock.elapsedTime * 2) * 0.3
          : 1
      ref.current.scale.setScalar(pulse)
    }
    setDist(camera.position.length())
  })

  return (
    <group position={pos}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.008, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
      {pad.has_in_flight && <pointLight color={color} intensity={0.5} distance={0.2} />}
      {dist < 2.7 && (() => {
        const s = Math.min(0.6, (2.7 - dist) * 4)
        return (
          <Html center style={{ pointerEvents:'none', transform:`scale(${s})`, transformOrigin:'center' }}>
            <div style={{ fontSize:'10px', color, fontFamily:'JetBrains Mono', whiteSpace:'nowrap', opacity:0.5, marginTop:'6px' }}>
              {pad.name.length > 15 ? pad.name.slice(0,13)+'..' : pad.name}
            </div>
          </Html>
        )
      })()}
    </group>
  )
}

/* ============================================================
   ROCKET IN FLIGHT — animated rocket with exhaust trail
   ============================================================ */
function RocketInFlight({ launch }) {
  const rocketRef = useRef()
  const exhaustRef = useRef()
  const trailRef = useRef()
  const { camera } = useThree()
  const [dist, setDist] = useState(10)

  const currentPos = launch.current_position
  if (!currentPos || currentPos.alt <= 0) return null

  const pos = latLonToVec3(currentPos.lat, currentPos.lon, currentPos.alt)

  // Direction vector (pointing away from Earth = "up")
  const direction = pos.clone().normalize()

  // Trajectory path
  const trajectoryPoints = useMemo(() => {
    const traj = launch.trajectory || []
    if (traj.length < 2) return null

    const points = traj
      .filter(p => p.alt > 0)
      .map(p => latLonToVec3(p.lat, p.lon, p.alt))

    if (points.length < 2) return null
    return points
  }, [launch.trajectory])

  // Exhaust animation
  useFrame((state) => {
    const t = state.clock.elapsedTime
    setDist(camera.position.length())

    // Rocket pulse
    if (rocketRef.current) {
      rocketRef.current.scale.setScalar(1 + Math.sin(t * 8) * 0.15)
    }

    // Exhaust flicker
    if (exhaustRef.current) {
      exhaustRef.current.scale.y = 1 + Math.sin(t * 15) * 0.4
      exhaustRef.current.material.opacity = 0.6 + Math.sin(t * 12) * 0.3
    }
  })

  const phaseColor = currentPos.phase === 'ORBITADA' ? '#00ff88'
    : currentPos.phase === 'ORBITAGA CHIQISH' ? '#00ffff'
    : currentPos.alt > 100 ? '#ffaa00'
    : '#ff4400'

  return (
    <group>
      {/* Rocket body */}
      <group position={pos}>
        {/* Main body — glowing sphere */}
        <mesh ref={rocketRef}>
          <sphereGeometry args={[0.02, 12, 12]} />
          <meshBasicMaterial color={phaseColor} />
        </mesh>

        {/* Exhaust plume */}
        {currentPos.phase !== 'ORBITADA' && (
          <mesh
            ref={exhaustRef}
            position={direction.clone().multiplyScalar(-0.04)}
          >
            <coneGeometry args={[0.015, 0.06, 8]} />
            <meshBasicMaterial
              color="#ff6600"
              transparent
              opacity={0.7}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Bright glow light */}
        <pointLight
          color={phaseColor}
          intensity={currentPos.phase !== 'ORBITADA' ? 2 : 0.5}
          distance={0.6}
        />

        {/* Label — only when very close */}
        {dist < 2.8 && (() => {
          const s = Math.min(0.6, (2.8 - dist) * 4)
          return (
            <Html center style={{ pointerEvents:'none', transform:`scale(${s})`, transformOrigin:'center' }}>
              <div style={{ fontSize:'10px', color:phaseColor, fontFamily:'JetBrains Mono', whiteSpace:'nowrap', textAlign:'center', marginTop:'8px' }}>
                {launch.short_name || launch.rocket_name}
              </div>
            </Html>
          )
        })()}
      </group>

      {/* Trajectory line */}
      {trajectoryPoints && trajectoryPoints.length > 1 && (
        <TrajectoryLine points={trajectoryPoints} color={phaseColor} />
      )}

      {/* Ground track line (from pad to current position) */}
      <GroundTrack
        padLat={launch.pad_lat}
        padLon={launch.pad_lon}
        currentLat={currentPos.lat}
        currentLon={currentPos.lon}
      />
    </group>
  )
}

/* ============================================================
   TRAJECTORY LINE — 3D curve showing rocket path
   ============================================================ */
function TrajectoryLine({ points, color }) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(points.length * 3)
    points.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    })
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geom
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={0.3}
        depthWrite={false}
        linewidth={1}
      />
    </line>
  )
}

/* ============================================================
   GROUND TRACK — dashed line on Earth surface
   ============================================================ */
function GroundTrack({ padLat, padLon, currentLat, currentLon }) {
  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const steps = 30
    const positions = new Float32Array(steps * 3)

    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1)
      const lat = padLat + (currentLat - padLat) * t
      const lon = padLon + (currentLon - padLon) * t
      const v = latLonToVec3(lat, lon, 10)
      positions[i * 3] = v.x
      positions[i * 3 + 1] = v.y
      positions[i * 3 + 2] = v.z
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geom
  }, [padLat, padLon, currentLat, currentLon])

  return (
    <line geometry={geometry}>
      <lineDashedMaterial
        color="#ffaa00"
        transparent
        opacity={0.2}
        dashSize={0.02}
        gapSize={0.02}
        depthWrite={false}
      />
    </line>
  )
}

/* ============================================================
   TRAJECTORY PREVIEW — for upcoming launches
   ============================================================ */
function TrajectoryPreview({ launch }) {
  const preview = launch.trajectory_preview
  if (!preview || preview.length < 2) return null

  const points = useMemo(() => {
    return preview
      .filter(p => p.alt > 0)
      .map(p => latLonToVec3(p.lat, p.lon, p.alt))
  }, [preview])

  if (points.length < 2) return null

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry()
    const positions = new Float32Array(points.length * 3)
    points.forEach((p, i) => {
      positions[i * 3] = p.x
      positions[i * 3 + 1] = p.y
      positions[i * 3 + 2] = p.z
    })
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geom
  }, [points])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial
        color="#ffaa00"
        transparent
        opacity={0.12}
        depthWrite={false}
      />
    </line>
  )
}

/* ============================================================
   MAIN EXPORT — All launch visuals combined
   ============================================================ */
export default function LaunchVisuals() {
  const launchPads = useCosmosStore((s) => s.launchPads)
  const inFlightLaunches = useCosmosStore((s) => s.inFlightLaunches)
  const launches = useCosmosStore((s) => s.launches)

  // Launches with trajectory preview (upcoming, within 24h)
  const previewLaunches = launches.filter(l =>
    !l.is_in_flight && l.trajectory_preview && l.trajectory_preview.length > 0
  )

  return (
    <group>
      {/* Launch pad markers */}
      {launchPads.map((pad, i) => (
        <LaunchPad key={`pad-${i}`} pad={pad} />
      ))}

      {/* In-flight rockets */}
      {inFlightLaunches.map((launch, i) => (
        <RocketInFlight key={`flight-${launch.id || i}`} launch={launch} />
      ))}

      {/* Trajectory previews for upcoming launches */}
      {previewLaunches.slice(0, 3).map((launch, i) => (
        <TrajectoryPreview key={`preview-${i}`} launch={launch} />
      ))}
    </group>
  )
}
