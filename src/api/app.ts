import { EventEmitter } from "events";
import express from "express";
import cors from "cors";
import { PORT, CORS_ORIGIN } from "../config";
import ApiController from "./interfaces/apiController.interface";
import { Server } from "http";

export default class App extends EventEmitter {
    public app: express.Application;
    private _server: Server | undefined;

    constructor(controllers: ApiController[]) {
        super();
        this.app = express();

        this.initializeMiddlewares();
        this.initializeControllers(controllers);
    }

    private initializeMiddlewares = () => {
        this.app.set("trust proxy", 1);
        this.app.use(
            cors<express.Request>({ origin: CORS_ORIGIN, credentials: true })
        );

        // Handles JSON responses, POST requests with JSON body content, etc.
        this.app.use(express.json());
    }

    private initializeControllers = (controllers: ApiController[]) => {
        controllers.forEach((controller) => {
            this.app.use(controller.basePath, controller.router);
        });
    }

    public listen() {
        this._server = this.app.listen(PORT, () => {
            console.log(`Server listening on port: ${PORT}`);
            this.emit("ready");
        });
    }

    public close() {
        this._server?.close();
    }
}