import "dotenv/config";
import express from "express";
import http from "http";
import { expressLoader } from "./loaders/express";
import { socketLoader } from "./loaders/socket";
import { cronLoader } from "./loaders/cron";
import logger from "./shared/logger";

const app = express();
const httpServer = http.createServer(app);

expressLoader(app);
socketLoader(httpServer);
cronLoader();

const PORT = process.env.PORT ?? 3001;
httpServer.listen(PORT, () => {
  logger.info(`🚀 Backend rodando em http://localhost:${PORT}`);
  logger.info(`📄 Swagger disponível em http://localhost:${PORT}/api-docs`);
});

export { app };
