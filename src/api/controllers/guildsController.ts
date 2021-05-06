import { Router, Response } from "express";
import ApiController from "../interfaces/apiController.interface";
import RequestWithUser from "../interfaces/requestWithUser.interface";
import authenticate from "../middleware/auth.middleware";
import GuildController from "./guildController";

export default class GuildsController implements ApiController {
    public basePath: string = "/guilds";
    public router = Router();

    constructor(){
        this.initializeMiddlewares();
        this.initializeControllers([
            new GuildController()
        ]);
        this.initializeRoutes();
    }

    private initializeMiddlewares = () => {
        this.router.use(authenticate);
    }

    private initializeControllers = (controllers: ApiController[]) => {
        controllers.forEach((controller) => {
            this.router.use(controller.basePath, controller.router);
        });
    }

    private initializeRoutes = () => {
        this.router.get("/", this.getAllGuilds);
    }

    private getAllGuilds = (request: RequestWithUser, res: Response) => {
        return res.send("Guilds Home - return a list of guilds for the token user: " + request.user?.userId);
    }
}