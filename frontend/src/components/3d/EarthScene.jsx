import { useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber'
import { OrbitControls, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import useCosmosStore from '../../stores/useCosmosStore'
import LaunchVisuals from './LaunchVisuals'

const EARTH_RADIUS = 2
const SCALE = EARTH_RADIUS / 6371

// Real Earth sidereal rotation: 360° in 86164.1 seconds
const EARTH_ROTATION_SPEED = (2 * Math.PI) / 86164.1  // rad/second — REAL speed

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
   CITIES
   ============================================================ */
const CITIES = [
  { name: 'Toshkent', lat: 41.30, lon: 69.24, pop: '2.9M', country: 'UZ', size: 3 },
  { name: 'Samarqand', lat: 39.65, lon: 66.96, pop: '550K', country: 'UZ', size: 1 },
  { name: 'Buxoro', lat: 39.77, lon: 64.42, pop: '280K', country: 'UZ', size: 1 },
  { name: 'Nukus', lat: 42.46, lon: 59.60, pop: '320K', country: 'UZ', size: 1 },
  { name: "Farg'ona", lat: 40.38, lon: 71.79, pop: '430K', country: 'UZ', size: 1 },
  { name: 'Namangan', lat: 41.00, lon: 71.67, pop: '600K', country: 'UZ', size: 1 },
  { name: 'Andijon', lat: 40.78, lon: 72.34, pop: '440K', country: 'UZ', size: 1 },
  { name: 'Navoiy', lat: 40.10, lon: 65.37, pop: '130K', country: 'UZ', size: 1 },
  { name: 'Almaty', lat: 43.24, lon: 76.95, pop: '2M', country: 'KZ', size: 2 },
  { name: 'Astana', lat: 51.17, lon: 71.43, pop: '1.3M', country: 'KZ', size: 2 },
  { name: 'Dushanbe', lat: 38.56, lon: 68.77, pop: '950K', country: 'TJ', size: 1.5 },
  { name: 'Bishkek', lat: 42.87, lon: 74.59, pop: '1.1M', country: 'KG', size: 1.5 },
  { name: 'Ashgabat', lat: 37.95, lon: 58.38, pop: '1M', country: 'TM', size: 1.5 },
  { name: 'Moscow', lat: 55.75, lon: 37.62, pop: '12.5M', country: 'RU', size: 3 },
  { name: 'Beijing', lat: 39.90, lon: 116.40, pop: '21M', country: 'CN', size: 3 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69, pop: '14M', country: 'JP', size: 3 },
  { name: 'New York', lat: 40.71, lon: -74.01, pop: '8.3M', country: 'US', size: 3 },
  { name: 'London', lat: 51.51, lon: -0.13, pop: '9M', country: 'UK', size: 3 },
  { name: 'Paris', lat: 48.86, lon: 2.35, pop: '2.1M', country: 'FR', size: 2 },
  { name: 'Dubai', lat: 25.20, lon: 55.27, pop: '3.5M', country: 'AE', size: 2 },
  { name: 'Istanbul', lat: 41.01, lon: 28.98, pop: '15M', country: 'TR', size: 2.5 },
  { name: 'Delhi', lat: 28.61, lon: 77.21, pop: '32M', country: 'IN', size: 3 },
  { name: 'Seoul', lat: 37.57, lon: 126.98, pop: '9.7M', country: 'KR', size: 2.5 },
  { name: 'São Paulo', lat: -23.55, lon: -46.63, pop: '12M', country: 'BR', size: 3 },
  { name: 'Cairo', lat: 30.04, lon: 31.24, pop: '10M', country: 'EG', size: 2.5 },
  { name: 'Sydney', lat: -33.87, lon: 151.21, pop: '5.3M', country: 'AU', size: 2 },
  { name: 'Los Angeles', lat: 34.05, lon: -118.24, pop: '4M', country: 'US', size: 2.5 },
  { name: 'Shanghai', lat: 31.23, lon: 121.47, pop: '24M', country: 'CN', size: 3 },
  { name: 'Singapore', lat: 1.35, lon: 103.82, pop: '5.7M', country: 'SG', size: 2 },
  { name: 'Berlin', lat: 52.52, lon: 13.40, pop: '3.7M', country: 'DE', size: 2 },
  { name: 'Mumbai', lat: 19.08, lon: 72.88, pop: '21M', country: 'IN', size: 2.5 },
  { name: 'Baikonur', lat: 45.96, lon: 63.31, pop: 'Kosmodrom', country: 'KZ', size: 1.5 },
  { name: 'Cape Canaveral', lat: 28.39, lon: -80.60, pop: 'NASA', country: 'US', size: 1.5 },
]

/* ============================================================
   SATELLITE SPRITE TEXTURE GENERATOR
   ============================================================ */
function createSatTexture(type, color) {
  const s = 64, c = document.createElement('canvas')
  c.width = s; c.height = s
  const ctx = c.getContext('2d'), cx = s/2, cy = s/2
  // Glow
  const g = ctx.createRadialGradient(cx,cy,0,cx,cy,s/2)
  g.addColorStop(0, color+'55'); g.addColorStop(0.4, color+'18'); g.addColorStop(1, 'transparent')
  ctx.fillStyle = g; ctx.fillRect(0,0,s,s)
  ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.shadowColor = color; ctx.shadowBlur = 3

  if (type === 'stations') {
    ctx.fillRect(cx-12,cy-2,24,4); ctx.fillRect(cx-2,cy-14,4,28)
    ctx.fillRect(cx-9,cy-12,18,3); ctx.fillRect(cx-9,cy+9,18,3)
  } else if (type === 'gps-ops' || type === 'galileo') {
    ctx.beginPath(); ctx.moveTo(cx,cy-8); ctx.lineTo(cx+6,cy); ctx.lineTo(cx,cy+8); ctx.lineTo(cx-6,cy); ctx.closePath(); ctx.fill()
    ctx.fillRect(cx-14,cy-2,8,4); ctx.fillRect(cx+6,cy-2,8,4)
  } else if (type === 'weather' || type === 'resource') {
    ctx.fillRect(cx-5,cy-4,10,8); ctx.fillRect(cx-13,cy-2,7,4); ctx.fillRect(cx+5,cy-2,7,4)
    ctx.fillRect(cx-1,cy-10,2,6); ctx.beginPath(); ctx.arc(cx,cy-11,3,0,Math.PI*2); ctx.stroke()
  } else if (type === 'science') {
    ctx.beginPath(); for(let i=0;i<6;i++){const a=(i*60-30)*Math.PI/180;const px=cx+7*Math.cos(a),py=cy+7*Math.sin(a);i===0?ctx.moveTo(px,py):ctx.lineTo(px,py)}
    ctx.closePath(); ctx.fill(); ctx.fillRect(cx-15,cy-1.5,10,3); ctx.fillRect(cx+5,cy-1.5,10,3)
  } else if (type === 'military') {
    ctx.beginPath(); ctx.moveTo(cx,cy-10); ctx.lineTo(cx+8,cy); ctx.lineTo(cx,cy+4); ctx.lineTo(cx-8,cy); ctx.closePath(); ctx.fill()
  } else if (type === 'geo') {
    ctx.fillRect(cx-4,cy-5,8,10); ctx.fillRect(cx-16,cy-3,12,6); ctx.fillRect(cx+4,cy-3,12,6)
    ctx.fillRect(cx-1,cy-9,2,4)
  } else {
    ctx.fillRect(cx-3,cy-3,6,6); ctx.fillRect(cx-12,cy-1.5,8,3); ctx.fillRect(cx+4,cy-1.5,8,3)
  }
  const tex = new THREE.CanvasTexture(c); tex.needsUpdate = true; return tex
}

const GROUP_COLORS = {
  stations:'#00ffff', active:'#00ff88', 'last-30-days':'#aaffcc', 'gps-ops':'#ffaa00',
  galileo:'#4488ff', weather:'#88ff00', resource:'#ff8800', science:'#ff44ff',
  military:'#ff2244', geo:'#ffff44', visual:'#44ffaa',
}
const GROUP_LABELS = {
  stations:'Kosmik stansiya', active:'Faol', 'last-30-days':'Yangi', 'gps-ops':'GPS',
  galileo:'Galileo', weather:'Ob-havo', resource:'Yer resurslari', science:'Ilmiy',
  military:'Harbiy', geo:'Geostatsionar', visual:'Ko\'rinadi',
}

/* ============================================================
   EARTH — NASA textures, day/night shader
   ============================================================ */
function Earth() {
  const meshRef = useRef()
  const cloudsRef = useRef()

  const [dayMap, nightMap, bumpMap, specMap, cloudsMap] = useLoader(THREE.TextureLoader, [
    '/textures/earth_day.jpg', '/textures/earth_night.jpg',
    '/textures/earth_bump.jpg', '/textures/earth_specular.jpg',
    '/textures/earth_clouds.jpg',
  ])

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      dayTex: { value: dayMap }, nightTex: { value: nightMap },
      specTex: { value: specMap }, sunDir: { value: new THREE.Vector3(1,0.3,0.5).normalize() },
    },
    vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vW=(modelMatrix*vec4(position,1.0)).xyz; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `uniform sampler2D dayTex,nightTex,specTex; uniform vec3 sunDir;
      varying vec2 vUv; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 n=normalize(vN); float d=dot(n,sunDir); float day=smoothstep(-0.15,0.25,d);
        vec4 dc=texture2D(dayTex,vUv); vec4 nc=texture2D(nightTex,vUv); nc.rgb*=1.8;
        float sp=texture2D(specTex,vUv).r; float sh=pow(max(dot(reflect(-sunDir,n),normalize(-vW)),0.0),20.0)*sp*0.4;
        vec3 c=mix(nc.rgb,dc.rgb+sh,day)+dc.rgb*0.02; gl_FragColor=vec4(c,1.0);
      }`,
  }), [dayMap, nightMap, specMap])

  useFrame((state, dt) => {
    // Sun direction slowly moves (1 full cycle per ~20 min for visual effect)
    const t = state.clock.elapsedTime * 0.005
    mat.uniforms.sunDir.value.set(Math.cos(t), 0.3, Math.sin(t)).normalize()
    // Clouds drift slightly relative to Earth surface
    if (cloudsRef.current) cloudsRef.current.rotation.y += dt * 0.0003
  })

  return (
    <group>
      <mesh ref={meshRef} material={mat}><sphereGeometry args={[EARTH_RADIUS, 128, 128]} /></mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[EARTH_RADIUS*1.006, 64, 64]} />
        <meshPhongMaterial map={cloudsMap} transparent opacity={0.18} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* Atmosphere */}
      <mesh><sphereGeometry args={[EARTH_RADIUS*1.015,64,64]}/>
        <shaderMaterial transparent depthWrite={false} side={THREE.FrontSide}
          vertexShader={`varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
          fragmentShader={`varying vec3 vN;void main(){float i=pow(1.0-abs(dot(vN,vec3(0,0,1))),5.0);gl_FragColor=vec4(0.3,0.6,1.0,i*0.18);}`}/></mesh>
      <mesh><sphereGeometry args={[EARTH_RADIUS*1.12,64,64]}/>
        <shaderMaterial transparent depthWrite={false} side={THREE.BackSide}
          vertexShader={`varying vec3 vN;void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
          fragmentShader={`varying vec3 vN;void main(){float i=pow(0.65-dot(vN,vec3(0,0,1)),3.0);gl_FragColor=vec4(0.25,0.5,1.0,i*0.4);}`}/></mesh>
    </group>
  )
}

/* ============================================================
   CITIES — zoom dependent
   ============================================================ */
function CityMarkers() {
  const { camera } = useThree()
  const [dist, setDist] = useState(10)
  useFrame(() => setDist(camera.position.length()))

  // Nuqtalar faqat yaqinda
  const visible = useMemo(() => {
    if (dist > 3.5) return []
    if (dist > 3) return CITIES.filter(c => c.size >= 3)
    if (dist > 2.8) return CITIES.filter(c => c.size >= 1.5)
    return CITIES
  }, [dist])

  // Nomlar faqat dist < 2.65
  const showLabels = dist < 2.65

  // Scale: dist 2.65 da 0.3, dist 2.5 da 0.6 — kichikdan boshlanadi
  const labelScale = showLabels ? Math.min(0.7, (2.65 - dist) * 4) : 0

  return <>
    {visible.map((city, i) => {
      const pos = latLonToVec3(city.lat, city.lon, 3)
      const isUz = city.country === 'UZ'
      const dotSize = isUz ? 0.006 : 0.002 + city.size * 0.0008
      return (
        <group key={i} position={pos}>
          <mesh><sphereGeometry args={[dotSize,6,6]}/><meshBasicMaterial color={isUz?'#00ff88':'#ffcc44'} transparent opacity={0.7}/></mesh>
          {showLabels && (
            <Html center style={{pointerEvents:'none', transform:`scale(${labelScale})`, transformOrigin:'center center'}}>
              <div style={{
                background:'transparent',
                fontSize:'10px',
                color:isUz?'rgba(0,255,136,0.7)':'rgba(255,220,130,0.4)',
                fontFamily:isUz?'Orbitron':'JetBrains Mono',
                whiteSpace:'nowrap',
                letterSpacing:'0.05em',
                marginTop:'8px',
              }}>
                {city.name}
              </div>
            </Html>
          )}
        </group>
      )
    })}
  </>
}

/* ============================================================
   SATELLITES — sprite icons per group, clickable with popup
   ============================================================ */
function Satellites() {
  const satellites = useCosmosStore((s) => s.satellites)
  const [selectedId, setSelectedId] = useState(null)
  const { camera, raycaster, pointer } = useThree()

  // Group by type
  const groups = useMemo(() => {
    const m = {}
    satellites.forEach(s => {
      const g = s.group || 'active'
      if (!m[g]) m[g] = []
      m[g].push(s)
    })
    return m
  }, [satellites])

  // Sprite textures per group (cached)
  const textures = useMemo(() => {
    const t = {}
    Object.entries(GROUP_COLORS).forEach(([g, c]) => { t[g] = createSatTexture(g, c) })
    return t
  }, [])

  // Click handler — save satellite ID (not object reference)
  const handleClick = useCallback((e) => {
    e.stopPropagation()
    raycaster.setFromCamera(pointer, camera)
    let bestId = null, bestDist = 0.15
    for (const sat of satellites) {
      const v = latLonToVec3(sat.lat, sat.lon, sat.alt)
      const d = raycaster.ray.distanceToPoint(v)
      if (d < bestDist) { bestDist = d; bestId = sat.id }
    }
    setSelectedId(bestId)
  }, [satellites, camera, raycaster, pointer])

  // Find selected sat from CURRENT data (updates every frame with new positions)
  const selectedSat = selectedId ? satellites.find(s => s.id === selectedId) : null

  if (!satellites.length) return null

  return (
    <group onClick={handleClick}>
      {Object.entries(groups).map(([groupName, sats]) => {
        const tex = textures[groupName] || textures['active']
        const color = GROUP_COLORS[groupName] || '#00ff88'
        return <SatGroup key={groupName} sats={sats} texture={tex} color={color} />
      })}

      {selectedSat && <SatInfo sat={selectedSat} onClose={() => setSelectedId(null)} />}
    </group>
  )
}

/** Render a group of satellites as instanced sprites */
function SatGroup({ sats, texture, color }) {
  const ref = useRef()

  useMemo(() => {
    if (!ref.current || !sats.length) return
    const dummy = new THREE.Object3D()
    sats.forEach((sat, i) => {
      const v = latLonToVec3(sat.lat, sat.lon, sat.alt)
      dummy.position.copy(v)
      // Billboard: always face camera by not setting rotation
      const s = 0.02 + (sat.size || 1) * 0.004
      dummy.scale.set(s, s, s)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [sats])

  if (!sats.length) return null

  return (
    <instancedMesh ref={ref} args={[null, null, sats.length]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

/** Satellite info popup — follows satellite in real-time */
function SatInfo({ sat, onClose }) {
  const groupRef = useRef()
  const col = sat.color || GROUP_COLORS[sat.group] || '#00ff88'

  useFrame(() => {
    if (groupRef.current) {
      const pos = latLonToVec3(sat.lat, sat.lon, sat.alt)
      groupRef.current.position.copy(pos)
    }
  })

  const groupLabel = GROUP_LABELS[sat.group] || sat.group

  // Build info sections
  const sections = []

  // Section 1: Orbit info (always available)
  sections.push({
    title: 'ORBIT MA\'LUMOTLARI',
    rows: [
      ['Balandlik', `${sat.alt?.toFixed(1)} km`, '#00ffff'],
      ['Tezlik', `${sat.velocity?.toFixed(2)} km/s (${((sat.velocity||0)*3600).toFixed(0)} km/h)`, '#00ff88'],
      ['Inklinatsiya', `${sat.inclination?.toFixed(1)}°`, '#ffaa00'],
      ['Davr', sat.period_min ? `${sat.period_min} min` : `${sat.period?.toFixed(1)} min`, '#ff88ff'],
      sat.apoapsis_km && ['Apogey', `${sat.apoapsis_km} km`, '#88aaff'],
      sat.periapsis_km && ['Perigey', `${sat.periapsis_km} km`, '#88aaff'],
      sat.eccentricity && ['Ekssentrisitet', `${Number(sat.eccentricity).toFixed(6)}`, '#888'],
      sat.mean_motion && ['O\'rtacha harakat', `${Number(sat.mean_motion).toFixed(4)} rev/day`, '#888'],
    ].filter(Boolean),
  })

  // Section 2: Identity
  sections.push({
    title: 'IDENTIFIKATSIYA',
    rows: [
      ['NORAD ID', sat.id, '#aaa'],
      sat.intl_designator && ['Xalqaro belgi', sat.intl_designator, '#aaa'],
      sat.object_type_label && ['Turi', sat.object_type_label, '#ddd'],
      sat.rcs_m2 && ['Radar ko\'rinishi', `${sat.rcs_m2} m²`, '#888'],
      sat.rcs_label && ['O\'lchami', sat.rcs_label, '#888'],
    ].filter(Boolean),
  })

  // Section 3: Owner & Launch (if available)
  const hasOwnerInfo = sat.country_name || sat.launch_date
  if (hasOwnerInfo) {
    sections.push({
      title: 'UCHIRISH MA\'LUMOTLARI',
      rows: [
        sat.country_name && ['Davlat/Egasi', sat.country_name, '#ffcc44'],
        sat.country_code && sat.country_code !== sat.country_name && ['Kod', sat.country_code, '#888'],
        sat.launch_date && ['Uchirish sanasi', sat.launch_date, '#44ddff'],
        sat.launch_site_name && ['Kosmodrom', sat.launch_site_name, '#44ddff'],
        sat.launch_site && !sat.launch_site_name && ['Kosmodrom kodi', sat.launch_site, '#888'],
        sat.ops_status && ['Status', sat.ops_status === '+' ? 'Faol' : sat.ops_status === 'D' ? 'Tushgan' : sat.ops_status === '-' ? 'Nofaol' : sat.ops_status, sat.ops_status === '+' ? '#00ff88' : '#ff4444'],
        sat.decay_date && ['Tushgan sana', sat.decay_date, '#ff6666'],
      ].filter(Boolean),
    })
  }

  // Section 4: Position
  sections.push({
    title: 'REAL-TIME POZITSIYA',
    rows: [
      ['Kenglik', `${sat.lat?.toFixed(4)}°`, '#999'],
      ['Uzunlik', `${sat.lon?.toFixed(4)}°`, '#999'],
      ['X', `${sat.x?.toFixed(1)} km`, '#666'],
      ['Y', `${sat.y?.toFixed(1)} km`, '#666'],
      ['Z', `${sat.z?.toFixed(1)} km`, '#666'],
    ],
  })

  return (
    <group ref={groupRef}>
      <pointLight color={col} intensity={0.8} distance={0.25} />

      <Html center={false} style={{ pointerEvents: 'auto', transform: 'translate(12px, -50%)' }}>
        <div onClick={(e) => e.stopPropagation()} style={{
          background: 'rgba(2,4,14,0.98)',
          border: `1px solid ${col}25`,
          borderRadius: 10,
          width: 270,
          fontFamily: 'JetBrains Mono, monospace',
          backdropFilter: 'blur(20px)',
          boxShadow: `0 12px 40px rgba(0,0,0,0.85), inset 0 1px 0 ${col}08`,
          overflow: 'hidden',
          animation: 'fadeSlideIn 0.25s ease-out',
        }}>
          {/* Colored top bar */}
          <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${col}, transparent)` }} />

          {/* Header */}
          <div style={{ padding: '10px 12px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: col, fontSize: 12, fontFamily: 'Orbitron', letterSpacing: '0.08em', fontWeight: 700, lineHeight: 1.3 }}>
                {sat.name}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: `${col}15`, color: col, border: `1px solid ${col}20` }}>
                  {groupLabel}
                </span>
                {sat.country_name && (
                  <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 3, background: 'rgba(255,200,60,0.08)', color: '#ffcc44', border: '1px solid rgba(255,200,60,0.15)' }}>
                    {sat.country_name}
                  </span>
                )}
              </div>
            </div>
            <span onClick={onClose} style={{
              color: '#555', cursor: 'pointer', fontSize: 10, width: 22, height: 22, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 5, border: '1px solid #1a1a2a', background: 'rgba(255,255,255,0.02)',
              marginLeft: 8, transition: 'all 0.2s',
            }} onMouseEnter={(e) => { e.target.style.background = 'rgba(255,0,0,0.15)'; e.target.style.color = '#ff4444' }}
               onMouseLeave={(e) => { e.target.style.background = 'rgba(255,255,255,0.02)'; e.target.style.color = '#555' }}>
              x
            </span>
          </div>

          {/* Sections */}
          <div style={{ padding: '0 12px 10px', maxHeight: 320, overflowY: 'auto' }}>
            {sections.map((section, si) => (
              <div key={si} style={{ marginTop: si === 0 ? 4 : 8 }}>
                <div style={{
                  fontSize: 7, color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase',
                  paddingBottom: 3, marginBottom: 3, borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  {section.title}
                </div>
                {section.rows.map(([label, value, vc], ri) => (
                  <div key={ri} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '2px 0', fontSize: 9,
                  }}>
                    <span style={{ color: '#4a4a5a', flexShrink: 0 }}>{label}</span>
                    <span style={{
                      color: vc, fontWeight: 500, textAlign: 'right',
                      marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{value}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${col}20, transparent)` }} />
        </div>

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translate(20px, -50%); }
            to { opacity: 1; transform: translate(12px, -50%); }
          }
        `}</style>
      </Html>
    </group>
  )
}

/* ============================================================
   DEBRIS / ISS / ORBIT RINGS
   ============================================================ */
function Debris() {
  const d = useCosmosStore((s) => s.debrisObjects)
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry(); const n = Math.min(d.length, 3000)
    const p = new Float32Array(Math.max(n,1)*3)
    for(let i=0;i<n;i++){const o=d[i];const v=latLonToVec3(o.lat,o.lon,o.alt);p[i*3]=v.x;p[i*3+1]=v.y;p[i*3+2]=v.z}
    g.setAttribute('position',new THREE.BufferAttribute(p,3)); return g
  }, [d])
  if(!d.length) return null
  return <points geometry={geom}><pointsMaterial color="#ff4444" size={0.005} transparent opacity={0.25} sizeAttenuation depthWrite={false}/></points>
}

function ISS() {
  const iss = useCosmosStore((s)=>s.issData)
  const ref = useRef()
  const { camera } = useThree()
  const [dist, setDist] = useState(10)

  useFrame((s) => {
    if(ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.3
    setDist(camera.position.length())
  })

  if(!iss?.lat) return null
  const p = latLonToVec3(iss.lat, iss.lon, iss.alt||408)

  return(
    <group position={p} ref={ref}>
      <mesh><boxGeometry args={[0.035,0.005,0.005]}/><meshBasicMaterial color="#00ffff"/></mesh>
      <mesh><boxGeometry args={[0.006,0.045,0.001]}/><meshBasicMaterial color="#4488ff" transparent opacity={0.7}/></mesh>
      <pointLight color="#00ffff" intensity={1} distance={0.5}/>
      {dist < 2.7 && (() => {
        const s = Math.min(0.6, (2.7 - dist) * 4)
        return (
          <Html center style={{pointerEvents:'none', transform:`scale(${s})`, transformOrigin:'center'}}>
            <div style={{fontSize:'10px',color:'#00ffff',fontFamily:'Orbitron',whiteSpace:'nowrap',opacity:0.5,marginTop:'8px'}}>ISS</div>
          </Html>
        )
      })()}
    </group>
  )
}

function OrbitRings(){
  return <>{[{alt:400,c:'#00ffff',o:0.03},{alt:2000,c:'#0044aa',o:0.02},{alt:35786,c:'#ffaa00',o:0.03}].map((r,i)=>(
    <mesh key={i} rotation={[Math.PI/2,0,0]}><ringGeometry args={[EARTH_RADIUS+r.alt*SCALE-0.002,EARTH_RADIUS+r.alt*SCALE+0.002,128]}/>
    <meshBasicMaterial color={r.c} transparent opacity={r.o} side={THREE.DoubleSide} depthWrite={false}/></mesh>
  ))}</>
}

/* ============================================================
   MAIN SCENE
   All objects in EarthGroup rotate together at real speed.
   Backend sends real lat/lon, so positions are Earth-fixed.
   ============================================================ */
function EarthGroup() {
  const groupRef = useRef()

  useFrame((_, dt) => {
    // Real sidereal rotation — Earth completes 1 turn in 23h 56m
    // This is very slow (barely visible per frame) — REAL speed
    if (groupRef.current) {
      groupRef.current.rotation.y += EARTH_ROTATION_SPEED * dt
    }
  })

  return (
    <group ref={groupRef}>
      <Earth />
      <CityMarkers />
      <Satellites />
      <Debris />
      <ISS />
      <LaunchVisuals />
    </group>
  )
}

export default function EarthScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 5], fov: 45 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ background: '#020206' }}
      dpr={[1, 1.5]}
    >
      <ambientLight intensity={0.08} />
      <directionalLight position={[10, 3, 5]} intensity={1.5} color="#fff5e0" />
      <Stars radius={100} depth={80} count={18000} factor={4} saturation={0} />

      <EarthGroup />
      <OrbitRings />

      <OrbitControls
        enablePan={false}
        minDistance={2.5}
        maxDistance={20}
        rotateSpeed={0.4}
        zoomSpeed={0.8}
        autoRotate={false}
      />
    </Canvas>
  )
}
