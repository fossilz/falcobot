import { Router, Response, NextFunction } from "express";
import HttpException from "../exceptions/httpException";
import InvalidGuildException from "../exceptions/invalidGuildException";
import ApiController from "../interfaces/apiController.interface";
import GuildRequest from "../interfaces/guildRequest.interface";

export default class GuildRolesController implements ApiController {
    public basePath: string = "/roles";
    public router = Router({mergeParams: true});

    constructor(){
        this.initializeRoutes();
    }

    private initializeRoutes = () => {
        this.router.get("/", this.getRoles);
    }

    private getRoles = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        var roles = await request.repo?.Roles.selectAll(request.guildMember.guildId);
        if (roles === undefined) return next(new HttpException(404, "No roles found"));
        return res.send(roles);
    }
}
