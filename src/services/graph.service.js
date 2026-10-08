import { getGraph } from '../db/repository.js';

// ---------------------------------------------------------------------------
// Navegación sobre el grafo del mapa (Dijkstra).
// ---------------------------------------------------------------------------

function buildGraph() {
  const { nodes, edges } = getGraph();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const adj = new Map();
  for (const n of nodes) adj.set(n.id, []);

  // Aristas no dirigidas: cada una conecta en ambos sentidos.
  for (const e of edges) {
    if (adj.has(e.node_a) && adj.has(e.node_b)) {
      adj.get(e.node_a).push({ to: e.node_b, weight: e.weight });
      adj.get(e.node_b).push({ to: e.node_a, weight: e.weight });
    }
  }
  return { nodes: byId, adj };
}

// Dijkstra desde una fuente hacia todos los nodos alcanzables.
// Devuelve { dist, prev } (Mapas).
function dijkstra(adj, startId) {
  const dist = new Map([[startId, 0]]);
  const prev = new Map();
  const visited = new Set();
  const pq = new Map([[startId, 0]]);

  while (pq.size > 0) {
    // Extraer el nodo con menor distancia (cola de prioridad simple,
    // suficiente para grafos pequeños como los de la maqueta).
    let current = null;
    let minDist = Infinity;
    for (const [id, d] of pq) {
      if (d < minDist) {
        minDist = d;
        current = id;
      }
    }
    if (current === null) break;
    pq.delete(current);
    if (visited.has(current)) continue;
    visited.add(current);

    for (const { to, weight } of adj.get(current) || []) {
      const nd = dist.get(current) + weight;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd);
        prev.set(to, current);
        pq.set(to, nd);
      }
    }
  }
  return { dist, prev };
}

function reconstructPath(prev, startId, endId) {
  const path = [];
  let cur = endId;
  while (cur !== undefined) {
    path.unshift(cur);
    if (cur === startId) break;
    cur = prev.get(cur);
  }
  return path;
}

// Resuelve una referencia de nodo (id numérico o label) a su id.
function resolveNodeId(graph, ref) {
  if (typeof ref === 'number' && graph.nodes.has(ref)) return ref;
  for (const [id, n] of graph.nodes) {
    if (n.label === ref) return id;
  }
  return null;
}

// Nodo de partida: el dado, o el de tipo "entrada" por defecto.
function resolveStart(graph, ref) {
  if (ref !== undefined && ref !== null && ref !== '') {
    return resolveNodeId(graph, ref);
  }
  for (const [id, n] of graph.nodes) {
    if (n.type === 'entrada') return id;
  }
  for (const [id] of graph.nodes) return id;
  return null;
}

// Ruta más corta entre dos nodos (por id o por label).
export function shortestPath(fromRef, toRef) {
  const graph = buildGraph();
  const fromId = resolveNodeId(graph, fromRef);
  const toId = resolveNodeId(graph, toRef);
  if (fromId === null || toId === null) {
    const err = new Error('Nodo no encontrado.');
    err.status = 404;
    throw err;
  }
  const { dist, prev } = dijkstra(graph.adj, fromId);
  if (dist.get(toId) === undefined) {
    const err = new Error('No existe una ruta entre esos nodos.');
    err.status = 404;
    throw err;
  }
  const path = reconstructPath(prev, fromId, toId).map((id) => graph.nodes.get(id));
  return {
    from: graph.nodes.get(fromId),
    to: graph.nodes.get(toId),
    distance: Math.round(dist.get(toId) * 100) / 100,
    path,
  };
}

// Plaza libre más cercana a un nodo (por defecto la entrada).
export function nearestFreeSpot(fromRef) {
  const graph = buildGraph();
  const fromId = resolveStart(graph, fromRef);
  if (fromId === null) {
    const err = new Error('No hay nodos en el grafo.');
    err.status = 404;
    throw err;
  }
  const { dist, prev } = dijkstra(graph.adj, fromId);

  let best = null;
  let bestDist = Infinity;
  for (const [id, n] of graph.nodes) {
    if (n.type !== 'plaza' || n.spot_status !== 'libre') continue;
    const d = dist.get(id);
    if (d === undefined) continue;
    if (d < bestDist) {
      bestDist = d;
      best = { id, node: n, distance: d };
    }
  }

  if (!best) {
    const err = new Error('No hay plazas libres.');
    err.status = 404;
    throw err;
  }

  const path = reconstructPath(prev, fromId, best.id).map((id) => graph.nodes.get(id));
  return {
    from: graph.nodes.get(fromId),
    spot: { number: best.node.spot_number, status: best.node.spot_status },
    distance: Math.round(bestDist * 100) / 100,
    path,
  };
}
