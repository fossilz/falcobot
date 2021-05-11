import { Router, Response, NextFunction } from "express";
import HttpException from "../exceptions/httpException";
import InvalidGuildException from "../exceptions/invalidGuildException";
import ApiController from "../interfaces/apiController.interface";
import GuildRequest from "../interfaces/guildRequest.interface";

export default class GuildChannelsController implements ApiController {
    public basePath: string = "/channels";
    public router = Router({mergeParams: true});

    constructor(){
        this.initializeRoutes();
    }

    private initializeRoutes = () => {
        this.router.get("/", this.getChannels);
    }

    private getChannels = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        var channels = await request.repo?.Channels.selectAll(request.guildMember?.guildId);
        if (channels === undefined) return next(new HttpException(404, "No channels found"));
        return res.send(channels);
    }
}
