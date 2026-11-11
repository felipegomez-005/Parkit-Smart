import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CarFront, Check, ChevronDown, CircleHelp, Clock3, Compass, Crosshair, LocateFixed, MapPin, Menu, Navigation, ParkingCircle, Search, Settings2, ShieldCheck, Signal, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { api } from './lib/api.js';
import { connectSocket, subscribe } from './lib/socket.js';
import ParkingMap from './components/ParkingMap.jsx';

const INITIAL_SPOTS = [
  { number: 'P1', zone_name: 'Sector A', status: 'libre', x: 510, y: 328 },
  { number: 'P2', zone_name: 'Sector A', status: 'ocupado', x: 575, y: 328 },
  { number: 'P3', zone_name: 'Sector B', status: 'ocupado', x: 560, y: 76 },
  { number: 'P4', zone_name: 'Sector B', status: 'libre', x: 630, y: 76 },
  { number: 'P5', zone_name: 'Sector C', status: 'libre', x: 95, y: 76 },
  { number: 'P6', zone_name: 'Sector C', status: 'ocupado', x: 160, y: 76 },
];

const statusLabel = (status) => status === 'libre' ? 'Disponible' : status === 'ocupado' ? 'Ocupada' : status || 'Sin datos';

export default function App() {
  const [spots, setSpots] = useState(INITIAL_SPOTS);
  const [selected, setSelected] = useState('P1');
  const [route, setRoute] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [connected, setConnected] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState('mapa');
  const [showSettings, setShowSettings] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);

  const [parking, setParking] = useState(null);
  const initialParkingApplied = useRef(false);

  // Plaza donde está estacionado el vehículo: se deriva del vehículo en vivo (socket) y, si no, de /parking.
  const parkedSpot = vehicle
    ? (spots.find((spot) => spot.id != null && spot.id === vehicle.parked_spot_id) || (parking?.id != null && parking.id === vehicle.parked_spot_id ? parking : null))
    : parking;

  const selectedSpot = spots.find((spot) => spot.number === selected) || null;
  const freeCount = spots.filter((spot) => spot.status === 'libre').length;
  const occupiedCount = spots.filter((spot) => spot.status === 'ocupado' || spot.status === 'estacionado').length;
  const filteredSpots = useMemo(() => spots.filter((spot) => `${spot.number} ${spot.zone_name || ''}`.toLowerCase().includes(query.toLowerCase())), [spots, query]);

  const refresh = useCallback(async () => {
    try {
      const [map, currentVehicle] = await Promise.all([api.getMap(), api.getVehicle()]);
      if (map?.spots?.length) setSpots(map.spots.map((spot) => ({ ...spot, zone_name: spot.zone_name || map.zones?.find((z) => z.id === spot.zone_id)?.name })));
      if (currentVehicle) setVehicle(currentVehicle);
      setApiReady(true);
      try {
        const saved = (await api.getParking())?.spot || null;
        setParking(saved);
        if (saved && !initialParkingApplied.current) setSelected(saved.number);
        initialParkingApplied.current = true;
      } catch { /* sin plaza guardada */ }
    } catch {
      setApiReady(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const socket = connectSocket();
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    setConnected(socket.connected);
    const off = subscribe({
      onMap: (map) => { if (map?.spots) setSpots(map.spots); },
      onVehicle: setVehicle,
      onSpotUpdate: (updated) => setSpots((current) => current.map((spot) => spot.id === updated.id || spot.number === updated.number ? { ...spot, ...updated } : spot)),
      onVehicleUpdate: setVehicle,
    });
    return () => { off(); socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); };
  }, [refresh]);

  const requestRoute = async (spotNumber) => {
    setSelected(spotNumber);
    setNotice('');
    try {
      const data = await api.getRoute('Entrada', `Plaza ${spotNumber}`);
      setRoute(data);
    } catch {
      setRoute(null);
      setNotice(apiReady ? 'No se pudo calcular la ruta desde el grafo del servidor.' : 'Vista de demostración: conecta el backend para calcular rutas reales.');
    }
  };

  const findNearest = async () => {
    setBusy(true); setNotice('');
    try {
      const result = await api.getFreeSpot('Entrada');
      if (result?.spot?.number) {
        setSelected(result.spot.number); setRoute(result);
        setNotice(`Encontramos ${result.spot.number}, la plaza disponible más cercana.`);
      }
    } catch {
      const nearest = spots.find((spot) => spot.status === 'libre');
      if (nearest) { setSelected(nearest.number); setRoute(null); setNotice(`La plaza libre sugerida es ${nearest.number}. Conecta el backend para obtener la ruta calculada.`); }
      else setNotice('No hay plazas disponibles en este momento.');
    } finally { setBusy(false); }
  };

  const park = async () => {
    if (!selectedSpot) return;
    setBusy(true); setNotice('');
    try {
      await api.park(selectedSpot.number);
      await refresh();
      setNotice(`Vehículo registrado en ${selectedSpot.number}.`);
    } catch (error) { setNotice(error.message || 'No se pudo registrar el estacionamiento.'); }
    finally { setBusy(false); }
  };

  const unpark = async () => {
    setBusy(true);
    try { await api.unpark(); await refresh(); setNotice('Vehículo retirado.'); }
    catch (error) { setNotice(error.message || 'No se pudo retirar el vehículo.'); }
    finally { setBusy(false); }
  };

  const toggleDemoStatus = async (spot) => {
    const next = spot.status === 'libre' ? 'ocupado' : 'libre';
    if (spot.id && apiReady) {
      try { await api.setSpotStatus(spot.id, next); }
      catch (error) { setNotice(error.message); }
    } else setSpots((current) => current.map((item) => item.number === spot.number ? { ...item, status: next } : item));
  };

  return <main className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><ParkingCircle size={22}/></div><div><strong>ParkIt<span>Smart</span></strong><small>ESTACIONAMIENTO INTELIGENTE</small></div></div>
      <div className="topbar-center"><span className="live-dot"/><span>{apiReady ? 'Sistema conectado' : 'Modo demostración'}</span><i/> <span className="garage-label">Nivel -1 · Subterráneo</span></div>
      <div className="top-actions"><button className="icon-button" aria-label="Ayuda"><CircleHelp size={19}/></button><button className="icon-button" aria-label="Configuración" onClick={() => setShowSettings(true)}><Settings2 size={19}/></button><div className="avatar">PS</div></div>
    </header>

    <section className="workspace">
      <aside className="sidebar">
        <div className="sidebar-heading"><div><p className="eyebrow">TU ESTACIONAMIENTO</p><h1>Encuentra tu plaza</h1></div><button className="round-small" onClick={() => setShowAll(!showAll)}><SlidersHorizontal size={16}/></button></div>
        <div className="searchbox"><Search size={18}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar plaza o sector"/><kbd>⌘ K</kbd></div>
        <div className="availability-card"><div className="availability-top"><span>Disponibilidad general</span><span className="availability-icon"><Activity size={16}/></span></div><div className="availability-number">{freeCount}<small> / {spots.length}</small></div><div className="availability-bar"><span style={{ width: `${spots.length ? freeCount / spots.length * 100 : 0}%` }}/></div><div className="availability-legend"><span><i className="green-dot"/> {freeCount} libres</span><span><i className="red-dot"/> {occupiedCount} ocupadas</span></div></div>
        <div className="section-title"><span>PLAZAS</span><button onClick={() => setShowAll(!showAll)}>{showAll ? 'Ver menos' : 'Ver todas'} <ChevronDown size={14}/></button></div>
        <div className="spot-list">
          {(showAll ? filteredSpots : filteredSpots.slice(0, 4)).map((spot) => <button key={spot.number} className={`spot-row ${selected === spot.number ? 'selected' : ''}`} onClick={() => requestRoute(spot.number)}><span className={`spot-icon ${spot.status === 'libre' ? 'is-free' : 'is-busy'}`}><CarFront size={18}/></span><span className="spot-info"><strong>{spot.number}</strong><small>{spot.zone_name || 'Estacionamiento'}</small></span><span className={`status-pill ${spot.status === 'libre' ? 'free' : 'busy'}`}><i/>{statusLabel(spot.status)}</span><ChevronDown className="row-chevron" size={15}/></button>)}
          {filteredSpots.length === 0 && <p className="empty-state">No encontramos plazas con ese nombre.</p>}
        </div>
        <div className="sidebar-divider"/>
        <button className="nearest-button" onClick={findNearest} disabled={busy}><Sparkles size={17}/>{busy ? 'Buscando...' : 'Encontrar plaza más cercana'}<ArrowRight size={17}/></button>
        <div className="sidebar-bottom"><div className="secure-icon"><ShieldCheck size={17}/></div><div><strong>Tu estacionamiento, bajo control</strong><small>Información actualizada en tiempo real</small></div></div>
      </aside>

      <section className="map-area">
        <div className="map-toolbar"><div className="map-title"><span className="map-title-icon"><MapPin size={16}/></span><div><strong>Mapa del estacionamiento</strong><small>Distribución de plazas · Vista superior</small></div></div><div className="map-tools"><span className="map-live"><i/> EN VIVO</span><button className="map-tool" title="Centrar mapa"><Crosshair size={17}/></button><button className="map-tool" title="Brújula"><Compass size={17}/></button></div></div>
        <div className="map-canvas-wrap"><ParkingMap spots={spots} selected={selected} route={route} onSelect={requestRoute} zoom={mapZoom} vehicle={vehicle} parkedNumber={parkedSpot?.number}/><div className="map-zoom"><button aria-label="Acercar" onClick={() => setMapZoom((z) => Math.min(1.5, z + 0.1))}>＋</button><button aria-label="Alejar" onClick={() => setMapZoom((z) => Math.max(0.8, z - 0.1))}>−</button></div><div className="map-compass"><Navigation size={18}/><small>N</small></div><div className="map-scale"><span/>20 m</div><div className="map-legend"><span><i className="green-dot"/> Disponible</span><span><i className="red-dot"/> Ocupada</span><span><i className="blue-dot"/> Tu ruta</span></div></div>
        <div className="map-footer"><span><Signal size={14}/> Plano interior · Nivel -1</span><span>Actualizado hace unos segundos</span></div>
      </section>

      <aside className={`detail-panel ${panelExpanded ? '' : 'collapsed'}`}>
        <button className="panel-handle" onClick={() => setPanelExpanded(!panelExpanded)}><span/><ChevronDown size={15}/></button>
        {activeTab === 'vehiculo' && <div className="destination-preview"><div className="preview-icon"><CarFront size={23}/></div><div><small>MI VEHÍCULO</small><strong>{parkedSpot ? `Plaza ${parkedSpot.number}` : 'Sin plaza guardada'}</strong><small>{parkedSpot ? (parkedSpot.zone_name || 'Estacionamiento') : 'Estaciona para guardar tu plaza'}</small></div></div>}
        <div className="detail-header"><div><p className="eyebrow">DESTINO SELECCIONADO</p><h2>{selectedSpot?.number || 'Selecciona una plaza'}</h2><p>{selectedSpot?.zone_name || 'Explora el plano para elegir'}</p></div><span className={`big-status ${selectedSpot?.status === 'libre' ? 'free' : 'busy'}`}><i/>{selectedSpot ? statusLabel(selectedSpot.status) : 'Sin selección'}</span></div>
        <div className="destination-preview"><div className="preview-icon"><MapPin size={23}/></div><div><strong>{selectedSpot?.zone_name || 'Estacionamiento ParkIt'}</strong><small>{selectedSpot ? `Plaza ${selectedSpot.number} · Nivel -1` : 'Nivel subterráneo'}</small></div><span className="preview-distance"><Navigation size={14}/>{route?.distance ? `${route.distance.toFixed(0)} m` : '—'}</span></div>
        <div className="route-summary"><div className="route-line"><span className="route-origin"/><div/><span className="route-destination"/></div><div className="route-copy"><div><small>DESDE</small><strong>Entrada principal</strong></div><div><small>HASTA</small><strong>{selectedSpot?.number || '—'}</strong></div></div></div>
        {route?.path?.length > 0 && <div className="instruction-card"><span className="instruction-icon"><ArrowUp size={20}/></span><div><small>INDICACIÓN DE RUTA</small><strong>{route.path.length > 2 ? 'Continúa por el pasillo indicado' : 'Dirígete hacia tu plaza'}</strong><small>{route.path.length} puntos de navegación</small></div></div>}
        {notice && <div className="notice"><span>{notice}</span><button onClick={() => setNotice('')}><X size={14}/></button></div>}
        <div className="detail-actions"><button className="primary-action" onClick={() => requestRoute(selected)} disabled={!selectedSpot || busy}><Navigation size={17}/> Trazar ruta</button><button className="secondary-action" onClick={park} disabled={!selectedSpot || selectedSpot.status !== 'libre' || busy}><Check size={17}/> Estacionar aquí</button></div>
        {vehicle?.status === 'estacionado' && <button className="unpark-action" onClick={unpark} disabled={busy}><CarFront size={16}/> Retirar mi vehículo</button>}
        <div className="detail-meta"><span><Clock3 size={14}/> Acceso inmediato</span><span><ShieldCheck size={14}/> Zona monitoreada</span></div>
        <div className="panel-bottom-note">ParkIt Smart <span>·</span> Navegación inteligente</div>
      </aside>
    </section>

    <nav className="mobile-nav"><button className={activeTab === 'mapa' ? 'active' : ''} onClick={() => setActiveTab('mapa')}><MapPin size={19}/>Mapa</button><button className={activeTab === 'plazas' ? 'active' : ''} onClick={() => { setActiveTab('plazas'); setPanelExpanded(true); }}><ParkingCircle size={19}/>Plazas</button><button className={activeTab === 'vehiculo' ? 'active' : ''} onClick={() => { setActiveTab('vehiculo'); setPanelExpanded(true); }}><CarFront size={19}/>Vehículo</button></nav>
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><div className="settings-modal" onClick={(e) => e.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">PARKIT SMART</p><h3>Configuración</h3></div><button className="icon-button" onClick={() => setShowSettings(false)}><X size={18}/></button></div><div className="setting-line"><div><strong>Conexión con el servidor</strong><small>{apiReady ? 'API disponible' : 'Sin conexión · modo demo'}</small></div><span className={`connection-state ${apiReady ? 'online' : ''}`}>{apiReady ? 'Conectado' : 'Desconectado'}</span></div><div className="setting-line"><div><strong>Actualización en tiempo real</strong><small>Socket.IO</small></div><span className="connection-state">{connected ? 'Activo' : 'Pendiente'}</span></div><button className="secondary-action full" onClick={refresh}><Activity size={16}/> Volver a comprobar conexión</button></div></div>}
  </main>;
}
