import { Router, Response, NextFunction } from "express";
import HttpException from "../exceptions/httpException";
import InvalidGuildException from "../exceptions/invalidGuildException";
import ApiController from "../interfaces/apiController.interface";
import GuildRequest from "../interfaces/guildRequest.interface";
import RequestWithUser from "../interfaces/requestWithUser.interface";
import authGuild from "../middleware/guildauth.middleware";
import AutoRespondersController from "./autoRespondersController";
import AutoRolesController from "./autoRolesController";
import GuildChannelsController from "./guildChannelsController";
import GuildEmojisController from "./guildEmojisController";
import GuildRolesController from "./guildRolesController";

export default class GuildController implements ApiController {
    public basePath: string = "/:guildid";
    public router = Router({mergeParams: true});

    constructor(){
        this.initializeMiddlewares();
        this.initializeControllers([
            new AutoRespondersController(),
            new GuildEmojisController(),
            new AutoRolesController(),
            new GuildRolesController(),
            new GuildChannelsController()
        ]);
        this.initializeRoutes();
        this.initializeErrorHandling();
    }

    private initializeMiddlewares = () => {
        this.router.use(authGuild);
    }

    private initializeControllers = (controllers: ApiController[]) => {
        controllers.forEach((controller) => {
            this.router.use(controller.basePath, controller.router);
        });
    }

    private initializeRoutes = () => {
        this.router.get("/", this.getGuildDashboard);
    }

    private initializeErrorHandling = () => {
        this.router.use(this.handleInvalidGuild);
    }

    private getGuildDashboard = async (request: GuildRequest, res: Response, _: NextFunction) => {
        const guild = request.guild;
        return res.send("Place Guild dashboard here.  User: " + request.user?.userId + ", Guild: " + JSON.stringify(guild));
    }

    private handleInvalidGuild = async (error: HttpException, request: RequestWithUser, res: Response, next: NextFunction) => {
        if (!(error instanceof InvalidGuildException)) {
            return next(error);
        }
        return res.send("Place missing guild screen here.  User: " + request.user?.userId);
    }
}