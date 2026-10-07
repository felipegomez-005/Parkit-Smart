import { createServer } from 'node:http';
import { Server } from 'socket.io';
import config from './config.js';
import { createApp } from './app.js';
import { initSocket } from './sockets/index.js';

const app = createApp();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: config.corsOrigin },
});

initSocket(io);

httpServer.listen(config.port, config.host, () => {
  console.log(`[ParkIt] Backend escuchando en http://${config.host}:${config.port}`);
  console.log(`[ParkIt] Base de datos: ${config.dbPath}`);
});
