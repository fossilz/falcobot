/**
 * WebServer
 */
import { EventEmitter } from "events";
import { createServer, Server } from "http";
import express, { Express } from "express";
import cors from "cors";
import { PORT, CORS_ORIGIN } from "../config";
import routes from "../routes";

class WebServer extends EventEmitter {
  public app: Express;
  public server: Server;

  constructor() {
    super();
    this.init();
  }

  private init() {
    // App
    this.app = express();

    // Server
    this.server = createServer(this.app);

    // Docker has nginx proxy in front so we need to ensure
    // cookies/session/etc gets passed through
    this.app.set("trust proxy", 1);
    this.app.use(
      cors<express.Request>({ origin: CORS_ORIGIN, credentials: true })
    );

    // Handles JSON responses, POST requests with JSON body content, etc.
    this.app.use(express.json());

    // Setup all routes/route paths defined in /routes folder
    this.app.use(routes);

    this.server.listen(PORT, () => {
      console.log(`Server listening on port: ${PORT}`);
      this.emit("ready");
    });
  }

  public close() {
    if (this.server) this.server.close();
  }
}

export default WebServer;
