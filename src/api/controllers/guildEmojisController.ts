import { Router, Response, NextFunction } from "express";
import Discord from "../../classes/Discord";
import InvalidGuildException from "../exceptions/invalidGuildException";
import ApiController from "../interfaces/apiController.interface";
import GuildRequest from "../interfaces/guildRequest.interface";

export default class GuildEmojisController implements ApiController {
    public basePath: string = "/emojis";
    public router = Router({mergeParams: true});

    constructor(){
        this.initializeRoutes();
    }

    private initializeRoutes = () => {
        this.router.get("/", this.getEmojis);
    }

    private getEmojis = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        var client = Discord.getInstance();
        const guild = client.client.guilds.cache.get(request.guildMember?.guildId);
        if (guild === undefined) return next(new InvalidGuildException(request.guildMember?.guildId));
        const emojis = guild.emojis.cache.array();
        return res.send(emojis);
    }
}
