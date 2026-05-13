import { useState, useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import './App.css'

const GEOSERVER = 'http://localhost:8080/geoserver/guelb_richatt/wms'

const FONDS = [
  { id: 'satellite', nom: '🛰️ Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
  { id: 'osm', nom: '🗺️ OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
  { id: 'terrain', nom: '⛰️ Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
]

const COUCHES = [
  { id: 'limite', nom: 'Limite Zone Protégée', layer: 'guelb_richatt:Limite de la zone protégée de Guelb Richatt', visible: true, opacite: 1, couleur: '#2E7D32', symbole: 'limite' },
  { id: 'cuvettes', nom: 'Cuvettes Inondables', layer: 'guelb_richatt:Cuvettes inondables', visible: true, opacite: 1, couleur: '#4FC3F7', symbole: 'polygone' },
  { id: 'cours_deau', nom: "Cours d'eau", layer: 'guelb_richatt:cours_deau', visible: true, opacite: 1, couleur: '#0288D1', symbole: 'ligne' },
  { id: 'pistes', nom: 'Pistes', layer: 'guelb_richatt:Pistes', visible: true, opacite: 1, couleur: '#5D4037', symbole: 'route' },
  { id: 'toponymie', nom: 'Toponymie', layer: 'guelb_richatt:Toponyme', visible: true, opacite: 1, couleur: '#6A1B9A', symbole: 'texte' },
  { id: 'localites', nom: 'Localités', layer: 'guelb_richatt:Localités', visible: true, opacite: 1, couleur: '#212121', symbole: 'ville' },
  { id: 'sites', nom: 'Sites Archéologiques', layer: 'guelb_richatt:Sites archéologiques', visible: true, opacite: 1, couleur: '#E65100', symbole: 'etoile' },
  { id: 'puits', nom: 'Anciens Puits', layer: 'guelb_richatt:Anciens puits', visible: true, opacite: 1, couleur: '#0277BD', symbole: 'puits' },
  { id: 'hotels', nom: 'Hôtels & Auberges', layer: 'guelb_richatt:Hotels et auberges', visible: true, opacite: 1, couleur: '#E65100', symbole: 'hotel' },
  { id: 'sante', nom: 'Infrastructures Santé', layer: 'guelb_richatt:Infrastructures de santé', visible: true, opacite: 1, couleur: '#C62828', symbole: 'sante' },
  { id: 'aerodrome', nom: 'Aérodrome', layer: 'guelb_richatt:Aérodrome', visible: true, opacite: 1, couleur: '#1565C0', symbole: 'aerodrome' },
]

const LOCALITES_SEARCH = [
  { nom: 'Chinguetti', lat: 20.452, lng: -12.366 },
  { nom: 'Ourane', lat: 20.65, lng: -11.0 },
  { nom: 'Aghmakem', lat: 20.82, lng: -11.18 },
  { nom: 'Tazazmoutt', lat: 20.78, lng: -11.15 },
  { nom: 'Legneiba', lat: 20.72, lng: -11.05 },
  { nom: 'Elmabrouk', lat: 20.75, lng: -11.2 },
]

// Symboles SVG standards SIG
function SymboleSIG({ type, couleur }) {
  switch(type) {
    case 'limite':
      return <svg width="36" height="12"><line x1="0" y1="6" x2="36" y2="6" stroke={couleur} strokeWidth="3" strokeDasharray="8,4"/></svg>
    case 'polygone':
      return <svg width="20" height="14"><rect x="0" y="0" width="20" height="14" fill={couleur} fillOpacity="0.4" stroke={couleur} strokeWidth="1.5"/></svg>
    case 'ligne':
      return <svg width="36" height="12"><path d="M0,6 Q9,2 18,6 Q27,10 36,6" fill="none" stroke={couleur} strokeWidth="2.5"/></svg>
    case 'route':
      return <svg width="36" height="12">
        <line x1="0" y1="4" x2="36" y2="4" stroke={couleur} strokeWidth="1.5"/>
        <line x1="0" y1="8" x2="36" y2="8" stroke={couleur} strokeWidth="1.5"/>
      </svg>
    case 'texte':
      return <svg width="24" height="14"><text x="0" y="12" fontSize="14" fill={couleur} fontWeight="bold" fontStyle="italic">Aa</text></svg>
    case 'ville':
      // Carré plein noir — symbole standard localité
      return <svg width="14" height="14"><rect x="2" y="2" width="10" height="10" fill={couleur}/></svg>
    case 'etoile':
      // Étoile — symbole standard site archéologique
      return <svg width="16" height="16" viewBox="0 0 16 16">
        <polygon points="8,1 10,6 15,6 11,9 13,14 8,11 3,14 5,9 1,6 6,6" fill={couleur}/>
      </svg>
    case 'puits':
      // Cercle avec croix — symbole standard puits
      return <svg width="16" height="16">
        <circle cx="8" cy="8" r="6" fill="white" stroke={couleur} strokeWidth="2"/>
        <line x1="8" y1="3" x2="8" y2="13" stroke={couleur} strokeWidth="1.5"/>
        <line x1="3" y1="8" x2="13" y2="8" stroke={couleur} strokeWidth="1.5"/>
      </svg>
    case 'hotel':
      // Carré avec H — symbole standard hôtel
      return <svg width="16" height="16">
        <rect x="1" y="1" width="14" height="14" fill={couleur} rx="2"/>
        <text x="4" y="12" fontSize="10" fill="white" fontWeight="bold">H</text>
      </svg>
    case 'sante':
      // Croix rouge sur fond blanc — symbole standard santé
      return <svg width="16" height="16">
        <rect x="1" y="1" width="14" height="14" fill="white" stroke={couleur} strokeWidth="1.5" rx="2"/>
        <line x1="8" y1="3" x2="8" y2="13" stroke={couleur} strokeWidth="3"/>
        <line x1="3" y1="8" x2="13" y2="8" stroke={couleur} strokeWidth="3"/>
      </svg>
    case 'aerodrome':
      // Cercle avec avion — symbole standard aérodrome
      return <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="none" stroke={couleur} strokeWidth="1.5"/>
        <text x="2.5" y="12" fontSize="10" fill={couleur}>✈</text>
      </svg>
    default:
      return <svg width="14" height="14"><circle cx="7" cy="7" r="6" fill={couleur}/></svg>
  }
}

export default function App() {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const wmsLayersRef = useRef({})
  const fondLayerRef = useRef(null)
  const [couches, setCouches] = useState(COUCHES)
  const [info, setInfo] = useState('')
  const [coordSouris, setCoordSouris] = useState({ lat: '--', lng: '--' })
  const [outil, setOutil] = useState('')
  const outilRef = useRef('')
  const mesureLayerRef = useRef(null)
  const mesurePointsRef = useRef([])
  const [modal, setModal] = useState(null)
  const [recherche, setRecherche] = useState('')
  const [fondActif, setFondActif] = useState('satellite')

  useEffect(() => {
    if (mapInstanceRef.current) return

    const map = L.map(mapRef.current, {
      center: [20.8, -11.2],
      zoom: 9,
      zoomControl: false,
    })

    // Fond satellite par défaut (comme le sujet)
    fondLayerRef.current = L.tileLayer(FONDS[0].url, {
      attribution: '© Esri'
    }).addTo(map)

    // Échelle graphique
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map)

    // Couches WMS
    COUCHES.forEach(c => {
      const wms = L.tileLayer.wms(GEOSERVER, {
        layers: c.layer,
        format: 'image/png',
        transparent: true,
        version: '1.1.1',
        opacity: 1,
      })
      wms.addTo(map)
      wmsLayersRef.current[c.id] = wms
    })

    mesureLayerRef.current = L.layerGroup().addTo(map)

    // Coordonnées souris en temps réel
    map.on('mousemove', (e) => {
      setCoordSouris({
        lat: e.latlng.lat.toFixed(5),
        lng: e.latlng.lng.toFixed(5)
      })
    })

    map.on('click', (e) => {
      const o = outilRef.current
      if (o === 'coordonnees') {
        setInfo(`📍 Lat: ${e.latlng.lat.toFixed(5)} | Lon: ${e.latlng.lng.toFixed(5)}`)
      }
      if (o === 'distance') {
        mesurePointsRef.current.push(e.latlng)
        const pts = mesurePointsRef.current
        mesureLayerRef.current.clearLayers()
        pts.forEach(p => L.circleMarker(p, { radius: 5, color: '#E53935' }).addTo(mesureLayerRef.current))
        if (pts.length > 1) {
          L.polyline(pts, { color: '#E53935', weight: 2 }).addTo(mesureLayerRef.current)
          let dist = 0
          for (let i = 1; i < pts.length; i++) dist += pts[i - 1].distanceTo(pts[i])
          setInfo(`📏 Distance: ${dist < 1000 ? dist.toFixed(0) + ' m' : (dist / 1000).toFixed(2) + ' km'}`)
        } else {
          setInfo(`📏 Cliquez un 2ème point pour mesurer`)
        }
      }
      if (o === 'surface') {
        mesurePointsRef.current.push(e.latlng)
        const pts = mesurePointsRef.current
        mesureLayerRef.current.clearLayers()
        pts.forEach(p => L.circleMarker(p, { radius: 5, color: '#1565C0' }).addTo(mesureLayerRef.current))
        if (pts.length >= 3) {
          L.polygon(pts, { color: '#1565C0', fillOpacity: 0.3 }).addTo(mesureLayerRef.current)
          setInfo(`⬛ ${pts.length} points sélectionnés`)
        } else {
          setInfo(`⬛ Cliquez pour délimiter (${pts.length} pt)`)
        }
      }
      if (o === 'identifier') {
  const couchesVisibles = couches.filter(c => c.visible).map(c => c.layer).join(',')
  const url = `${GEOSERVER}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo`
    + `&LAYERS=${couchesVisibles}&QUERY_LAYERS=${couchesVisibles}`
          + `&BBOX=${map.getBounds().toBBoxString()}`
          + `&WIDTH=${map.getSize().x}&HEIGHT=${map.getSize().y}`
          + `&X=${Math.round(map.latLngToContainerPoint(e.latlng).x)}`
          + `&Y=${Math.round(map.latLngToContainerPoint(e.latlng).y)}`
          + `&INFO_FORMAT=text/plain&SRS=EPSG:4326`
        setInfo('🔍 Identification...')
        fetch(url).then(r => r.text()).then(t => setInfo('🔍 ' + t.substring(0, 300))).catch(() => setInfo('🔍 Cliquez sur un élément visible'))
      }
    })

    mapInstanceRef.current = map
  }, [])

  useEffect(() => { outilRef.current = outil }, [outil])

  const changerFond = (fondId) => {
    setFondActif(fondId)
    const fond = FONDS.find(f => f.id === fondId)
    if (fondLayerRef.current) mapInstanceRef.current.removeLayer(fondLayerRef.current)
    fondLayerRef.current = L.tileLayer(fond.url, { attribution: '© ' + fond.nom }).addTo(mapInstanceRef.current)
    fondLayerRef.current.bringToBack()
  }

  const changerOpacite = (id, val) => {
    setCouches(prev => prev.map(c => {
      if (c.id === id) {
        wmsLayersRef.current[id].setOpacity(parseFloat(val))
        return { ...c, opacite: parseFloat(val) }
      }
      return c
    }))
  }

  const toggleCouche = (id) => {
    setCouches(prev => prev.map(c => {
      if (c.id === id) {
        if (c.visible) mapInstanceRef.current.removeLayer(wmsLayersRef.current[id])
        else wmsLayersRef.current[id].addTo(mapInstanceRef.current)
        return { ...c, visible: !c.visible }
      }
      return c
    }))
  }

  const toutActiver = () => setCouches(prev => prev.map(c => {
    if (!c.visible) wmsLayersRef.current[c.id].addTo(mapInstanceRef.current)
    return { ...c, visible: true }
  }))

  const toutCacher = () => setCouches(prev => prev.map(c => {
    if (c.visible) mapInstanceRef.current.removeLayer(wmsLayersRef.current[c.id])
    return { ...c, visible: false }
  }))

  const activerOutil = (o) => {
    setOutil(o)
    mesurePointsRef.current = []
    mesureLayerRef.current?.clearLayers()
    setInfo(`Outil actif : ${o} — Cliquez sur la carte`)
  }

  const effacer = () => {
    setOutil('')
    mesurePointsRef.current = []
    mesureLayerRef.current?.clearLayers()
    setInfo('')
  }

  const rechercherLocalite = () => {
    const trouve = LOCALITES_SEARCH.find(l => l.nom.toLowerCase().includes(recherche.toLowerCase()))
    if (trouve) {
      mapInstanceRef.current.setView([trouve.lat, trouve.lng], 12)
      setInfo(`📍 Zoom sur : ${trouve.nom}`)
    } else {
      setInfo(`❌ Non trouvé : ${recherche}`)
    }
  }

  return (
    <div className="app">
      {/* En-tête bleu comme le sujet */}
      <div className="header">
        <div className="header-gauche">
          <div className="header-logo-cercle">AP</div>
          <div>
            <h1>Aire Protégée de Guelb Richatt</h1>
            <small>Portail cartographique — IMPADRA</small>
          </div>
        </div>
        <div className="header-droite">
          <div className="impadra-logo">IMPADRA</div>
        </div>
      </div>

      <div className="corps">
        {/* Panneau gauche */}
        <div className="panneau">

          <div className="section-titre">🔎 Recherche</div>
          <div className="recherche-box">
            <input
              type="text"
              placeholder="Localité..."
              value={recherche}
              onChange={e => setRecherche(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && rechercherLocalite()}
            />
            <button onClick={rechercherLocalite}>Go</button>
          </div>

          <div className="section-titre">🗺️ Fond de carte</div>
          <div className="fonds-box">
            {FONDS.map(f => (
              <button key={f.id} className={fondActif === f.id ? 'fond-btn actif' : 'fond-btn'} onClick={() => changerFond(f.id)}>{f.nom}</button>
            ))}
          </div>

          <div className="section-titre">🛠️ Outils SIG</div>
          <div className="outils-grid">
            <button className={outil==='identifier'?'outil actif':'outil'} onClick={()=>activerOutil('identifier')}><span>🔍</span><span>Identifier</span></button>
            <button className={outil==='distance'?'outil actif':'outil'} onClick={()=>activerOutil('distance')}><span>📏</span><span>Distance</span></button>
            <button className={outil==='surface'?'outil actif':'outil'} onClick={()=>activerOutil('surface')}><span>⬛</span><span>Surface</span></button>
            <button className={outil==='coordonnees'?'outil actif':'outil'} onClick={()=>activerOutil('coordonnees')}><span>📍</span><span>Coord.</span></button>
            <button className="outil" onClick={()=>mapInstanceRef.current.setView([20.8,-11.2],9)}><span>🎯</span><span>Aire</span></button>
            <button className="outil" onClick={()=>mapInstanceRef.current.zoomIn()}><span>🔎</span><span>Zoom +</span></button>
            <button className="outil" onClick={()=>mapInstanceRef.current.zoomOut()}><span>🔍</span><span>Zoom -</span></button>
            <button className="outil" onClick={toutActiver}><span>👁️</span><span>Activer</span></button>
            <button className="outil" onClick={toutCacher}><span>🙈</span><span>Cacher</span></button>
            <button className="outil" onClick={effacer}><span>🗑️</span><span>Effacer</span></button>
            <button className="outil" onClick={()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen();else document.exitFullscreen()}}><span>⛶</span><span>Écran</span></button>
            <button className="outil" onClick={()=>window.print()}><span>🖨️</span><span>Imprimer</span></button>
            <button className="outil" onClick={()=>setModal('stats')}><span>📊</span><span>Stats</span></button>
            <button className="outil" onClick={()=>setModal('apropos')}><span>ℹ️</span><span>À propos</span></button>
          </div>

          {info && <div className="info-box">{info}</div>}

          <div className="section-titre">📋 Couches SIG</div>
          {couches.map(c => (
            <div key={c.id} className="couche-item">
              <label>
                <input type="checkbox" checked={c.visible} onChange={()=>toggleCouche(c.id)} />
                <SymboleSIG type={c.symbole} couleur={c.couleur} />
                <span>{c.nom}</span>
              </label>
              {c.visible && (
                <input type="range" min="0" max="1" step="0.1" value={c.opacite}
                  onChange={e => changerOpacite(c.id, e.target.value)}
                  className="opacite-slider" title="Opacité" />
              )}
            </div>
          ))}
        </div>

        {/* Carte */}
        <div className="carte-container">
          <div ref={mapRef} className="carte" />
          <div className="coord-barre">
            🖱️ Lat: {coordSouris.lat} | Lon: {coordSouris.lng}
          </div>
        </div>
      </div>

      {modal==='stats' && (
        <div className="modal-fond" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>📊 Statistiques des couches</h3>
            <table>
              <thead><tr><th>Couche</th><th>Entités</th><th>Type</th></tr></thead>
              <tbody>
                <tr><td>Limite Zone Protégée</td><td>1</td><td>Polygone</td></tr>
                <tr><td>Cuvettes Inondables</td><td>63</td><td>Polygone</td></tr>
                <tr><td>Cours d'eau</td><td>7 403</td><td>Ligne</td></tr>
                <tr><td>Pistes</td><td>247</td><td>Ligne</td></tr>
                <tr><td>Toponymie</td><td>79</td><td>Ligne</td></tr>
                <tr><td>Localités</td><td>34</td><td>Point</td></tr>
                <tr><td>Sites Archéologiques</td><td>19</td><td>Point</td></tr>
                <tr><td>Anciens Puits</td><td>34</td><td>Point</td></tr>
                <tr><td>Hôtels & Auberges</td><td>7</td><td>Point</td></tr>
                <tr><td>Infrastructures Santé</td><td>6</td><td>Point</td></tr>
                <tr><td>Aérodrome</td><td>1</td><td>Point</td></tr>
              </tbody>
            </table>
            <button onClick={()=>setModal(null)}>Fermer</button>
          </div>
        </div>
      )}

      {modal==='apropos' && (
        <div className="modal-fond" onClick={()=>setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h3>ℹ️ À propos</h3>
            <p><strong>Titre :</strong> Géoportail Guelb Richatt</p>
            <p><strong>Institution :</strong> MEDD — DiLZAP — IMPADRA</p>
            <p><strong>Université :</strong> Université de Casablanca BenMsik</p>
            <p><strong>Spécialité :</strong> Master Télédétection Géomatique Appliquée</p>
            <p><strong>Année :</strong> 2025–2026</p>
            <p><strong>Technologies :</strong> React.js · Leaflet.js · GeoServer · PostGIS</p>
            <button onClick={()=>setModal(null)}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  )
}