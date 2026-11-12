import React from 'react';

const POSITIONS = {
  P1: { x: 510, y: 327, zone: 'A' }, P2: { x: 575, y: 327, zone: 'A' },
  P3: { x: 560, y: 75, zone: 'B' }, P4: { x: 630, y: 75, zone: 'B' },
  P5: { x: 95, y: 75, zone: 'C' }, P6: { x: 160, y: 75, zone: 'C' },
};
const ROADS = 'M95 152H640 M100 276H575 M232 152V276 M458 152V276 M344 384V276';
const free = (status) => status === 'libre';

export default function ParkingMap({ spots = [], selected, route, onSelect, zoom = 1, vehicle, parkedNumber }) {
  const hasVehicle = Number.isFinite(vehicle?.position_x) && Number.isFinite(vehicle?.position_y);
  const heading = Number.isFinite(vehicle?.orientation) ? vehicle.orientation : 0;
  const routePoints = route?.path?.map((point) => `${point.x},${point.y}`).join(' ');
  const ordered = ['P5', 'P6', 'P3', 'P4', 'P1', 'P2'];
  return <svg className="parking-map" style={{ transform: `scale(${zoom})` }} viewBox="0 0 688 388" role="img" aria-label="Plano interactivo del estacionamiento ParkIt Smart">
    <defs>
      <pattern id="floorGrid" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M 28 0 L 0 0 0 28" fill="none" stroke="#e8edf1" strokeWidth=".7"/></pattern>
      <pattern id="parkingHatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#e5e9ed"/><path d="M0 0V9" stroke="#cbd3da" strokeWidth="2"/></pattern>
      <filter id="softShadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#617080" floodOpacity=".14"/></filter>
      <filter id="pinShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#172b43" floodOpacity=".22"/></filter>
    </defs>
    <rect width="688" height="388" rx="18" fill="#f3f6f8"/>
    <rect width="688" height="388" rx="18" fill="url(#floorGrid)"/>
    <path d="M8 8H680V380H8Z" fill="none" stroke="#cbd4dc" strokeWidth="12"/>
    <path d="M18 18H670V370H18Z" fill="none" stroke="#fff" strokeWidth="3"/>

    {/* Calles: ejes M95 152H640 (norte), M100 276H575 (sur), conectores y acceso. Tres capas: borde, relleno y eje punteado */}
    <path d={ROADS} fill="none" stroke="#b7c4cd" strokeWidth="28"/>
    <path d={ROADS} fill="none" stroke="#e6ecf0" strokeWidth="24"/>
    <path d={ROADS} fill="none" stroke="#9fb0bb" strokeWidth="1.6" strokeDasharray="8 7"/>

    {/* Rampa / acceso */}
    <g filter="url(#softShadow)"><path d="M12 294H192V380H12Z" fill="#dce3e8" stroke="#b8c4cd" strokeWidth="3"/><path d="M22 304H182V370H22Z" fill="url(#parkingHatch)"/><path d="M28 312L78 360M48 312L98 360M68 312L118 360M88 312L138 360M108 312L158 360" stroke="#b7c2ca" strokeWidth="5"/><text x="102" y="344" fill="#647383" fontSize="10" textAnchor="middle" fontWeight="700" letterSpacing="1">RAMPA</text></g>
    <g filter="url(#softShadow)"><path d="M264 178H424V250H264Z" fill="#e0e6eb" stroke="#9eabb6" strokeWidth="4"/><path d="M272 186H416V242H272Z" fill="#f8fafb" stroke="#c6d0d8" strokeWidth="2"/><path d="M280 194H408V234H280Z" fill="#eef2f5"/><rect x="286" y="200" width="30" height="28" rx="4" fill="#d8e0e6"/><path d="M290 205h22v18h-22z" fill="#fff"/><path d="M372 198h32v32h-32z" fill="#dce3e8"/><path d="M376 204h24M376 211h24M376 218h24M376 225h24" stroke="#aab7c1" strokeWidth="2"/><text x="344" y="217" fill="#8a98a5" textAnchor="middle" fontSize="8" fontWeight="700">SERVICIOS</text></g>
    {/* Pilares */}
    {[{x:48,y:196},{x:150,y:196},{x:500,y:196},{x:610,y:196},{x:400,y:312}].map((p,i)=><g key={i} filter="url(#softShadow)"><rect x={p.x} y={p.y} width="22" height="22" rx="3" fill="#fff" stroke="#aebbc5" strokeWidth="2"/><rect x={p.x+4} y={p.y+4} width="14" height="14" rx="2" fill="#d9e1e7"/></g>)}
    {/* Sectores de estacionamiento */}
    <g filter="url(#softShadow)">
      <rect x="42" y="42" width="154" height="88" rx="5" fill="#edf2f5" stroke="#aebbc5" strokeWidth="2"/><rect x="522" y="42" width="144" height="88" rx="5" fill="#edf2f5" stroke="#aebbc5" strokeWidth="2"/><rect x="476" y="294" width="133" height="78" rx="5" fill="#edf2f5" stroke="#aebbc5" strokeWidth="2"/>
      <path d="M119 50V122M594 50V122M542 302V364" stroke="#fff" strokeWidth="3"/>
      <path d="M48 123H113M125 123H190M528 123H588M600 123H660M483 365H537M548 365H602" stroke="#aeb8c1" strokeWidth="5"/>
    </g>
    <g className="sector-tag"><rect x="83" y="7" width="80" height="25" rx="8"/><text x="123" y="24">SECTOR C</text><rect x="556" y="7" width="80" height="25" rx="8"/><text x="596" y="24">SECTOR B</text><rect x="613" y="326" width="62" height="16" rx="8"/><text x="644" y="337">SECTOR A</text></g>

    {/* Plazas */}
    {ordered.map((number) => {
      const spot = spots.find((s) => s.number === number) || { number, status: 'libre' };
      const p = POSITIONS[number]; const isSelected = selected === number; const available = free(spot.status);
      const x = p.x - 28; const y = p.zone === 'A' ? 304 : 50;
      return <g key={number} className={`map-spot ${isSelected ? 'is-selected' : ''}`} onClick={() => onSelect(number)} role="button" tabIndex="0" aria-label={`${number}, ${available ? 'disponible' : 'ocupada'}`} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(number)}>
        <rect className="spot-hit" x={x} y={y} width="56" height="62" rx="4" fill={isSelected ? '#dceaff' : '#f9fbfc'} stroke={isSelected ? '#2478ed' : '#c2cdd5'} strokeWidth={isSelected ? '3' : '1.5'}/>
        <rect x={x+5} y={y+5} width="46" height="52" rx="3" fill={available ? '#e6f7ed' : '#fcebed'} opacity=".8"/>
        <circle cx={p.x} cy={y+14} r="5" fill={available ? '#20b86a' : '#e34f59'}/><circle cx={p.x} cy={y+14} r="9" fill={available ? '#20b86a' : '#e34f59'} opacity=".12"/>
        <text x={p.x} y={y+42} textAnchor="middle" className="spot-label">{number}</text>
        <path d={`M${x+7} ${y+60}h42`} stroke={available ? '#23b96c' : '#e35b63'} strokeWidth="3" strokeLinecap="round"/>
        {isSelected && <circle cx={p.x} cy={y+14} r="13" fill="none" stroke="#2879ed" strokeWidth="1.5" strokeDasharray="3 3"/>}
        {parkedNumber === number && <g><rect x={x-3} y={y-3} width="62" height="68" rx="7" fill="none" stroke="#f59e0b" strokeWidth="3"/><rect x={p.x-24} y={y+46} width="48" height="12" rx="6" fill="#f59e0b"/><text x={p.x} y={y+55} textAnchor="middle" fill="#fff" fontSize="8" fontWeight="800">TU AUTO</text></g>}
      </g>;
    })}

    {/* Ruta calculada desde el backend */}
    {routePoints && <g><polyline points={routePoints} fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"/><polyline points={routePoints} fill="none" stroke="#2878ed" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/><circle cx={route?.path?.[0]?.x} cy={route?.path?.[0]?.y} r="8" fill="#fff" stroke="#2878ed" strokeWidth="4"/><circle cx={route?.path?.at(-1)?.x} cy={route?.path?.at(-1)?.y} r="8" fill="#2878ed" stroke="#fff" strokeWidth="3"/></g>}
    {/* Vehículo (posición y orientación en grados; 0° = hacia arriba) */}
    {hasVehicle && <g transform={`translate(${vehicle.position_x} ${vehicle.position_y}) rotate(${heading})`} filter="url(#pinShadow)" aria-label="Tu vehículo"><circle r="15" fill="#2878ed" opacity=".18"/><rect x="-8" y="-13" width="16" height="26" rx="5" fill="#2878ed" stroke="#fff" strokeWidth="2"/><path d="M0 -18L7 -9H-7Z" fill="#fff" stroke="#2878ed" strokeWidth="1.5" strokeLinejoin="round"/></g>}
    {/* Entrada */}
    <g><path d="M300 384V350H388V384" fill="#dcecff" stroke="#82aee5" strokeWidth="2"/><path d="M332 373h24m-6 -5 6 5-6 5" fill="none" stroke="#2778e8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><text x="344" y="363" textAnchor="middle" fill="#3974bd" fontSize="11" fontWeight="800" letterSpacing="1.2">ENTRADA</text></g>
  </svg>;
}
