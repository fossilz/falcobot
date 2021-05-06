import { Router, Response, NextFunction } from "express";
import RepositoryFactory from "../../classes/RepositoryFactory";
import ApiController from "../interfaces/apiController.interface";
import RequestWithGuildMember from "../interfaces/requestWithGuildMember.interface";
import authGuild from "../middleware/guildauth.middleware";

export default class GuildController implements ApiController {
    public basePath: string = "/:guildid";
    public router = Router({mergeParams: true});

    constructor(){
        this.initializeMiddlewares();
        this.initializeControllers([]);
        this.intializeRoutes();
    }

    private initializeMiddlewares = () => {
        this.router.use(authGuild);
    }

    private initializeControllers = (controllers: ApiController[]) => {
        controllers.forEach((controller) => {
            this.router.use(controller.basePath, controller.router);
        });
    }

    private intializeRoutes = () => {
        this.router.get("/", this.getGuildDashboard);
    }

    private getGuildDashboard = async (request: RequestWithGuildMember, res: Response, next: NextFunction) => {
        const guildid = request.guildMember?.guildId;
        if (guildid === undefined) throw("Invalid guild id");
        const repo = await RepositoryFactory.getInstanceAsync();
        const guild = await repo.Guilds.select(guildid);
        if (guild === undefined){
            res.status(404).send("Guild not found");
            return next();
        }
        return res.send("Place Guild dashboard here.  User: " + request.user?.userId + ", Guild: " + JSON.stringify(guild));
    }
}