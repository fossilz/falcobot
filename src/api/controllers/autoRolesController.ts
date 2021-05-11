import { Router, Response, NextFunction } from "express";
import { AutoRoleModel } from "../../classes/dataModels/AutoRoleModel";
import HttpException from "../exceptions/httpException";
import InvalidGuildException from "../exceptions/invalidGuildException";
import ApiController from "../interfaces/apiController.interface";
import GuildRequest from "../interfaces/guildRequest.interface";

export default class AutoRolesController implements ApiController {
    public basePath: string = "/autoroles";
    public router = Router({mergeParams: true});

    constructor(){
        this.initializeRoutes();
    }

    private initializeRoutes = () => {
        this.router.get("/", this.getAutoRoles);
        this.router.get("/:autoRoleId", this.getAutoRole);
        this.router.post("/", this.postAutoRole);
        this.router.put("/:autoRoleId", this.putAutoRole);
        this.router.delete("/:autoRoleId", this.deleteAutoRole);
    }

    private getAutoRoles = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const roles = await request.repo?.AutoRoles.selectAll(request.guildMember?.guildId);
        return res.send(roles);
    }

    private getAutoRole = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const autoRoleId = parseInt(request.params["autoRoleId"]);
        if (isNaN(autoRoleId)){
            return next(new HttpException(404, "AutoRole not found"));
        }
        const role = await request.repo?.AutoRoles.select(request.guildMember?.guildId, autoRoleId);
        if (role === undefined){
            return next(new HttpException(404, "AutoRole not found"));
        }
        return res.send(role);
    }

    private postAutoRole = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const posted = request.body as AutoRoleModel;
        if (posted.role_id === undefined || posted.add_remove === undefined || posted.trigger_reverse === undefined || posted.prevent_assign === undefined){
            return next(new HttpException(400, "Invalid autorole"));
        }
        posted.trigger_role_id = posted.trigger_role_id || null;
        posted.trigger_on_add_remove = posted.trigger_on_add_remove || null;
        posted.guild_id = request.guildMember?.guildId;

        let autorole_id: number|undefined = undefined;
        try {
            autorole_id = await request.repo?.AutoRoles.insert(posted);
        } catch (e){
            return next(new HttpException(500, "Error while attempting to insert.  Please try again"));
        }
        if (autorole_id == undefined){
            return next(new HttpException(500, "Error while attempting to insert.  Please try again"));
        }
        const role = await request.repo?.AutoRoles.select(request.guildMember?.guildId, autorole_id);
        if (role === undefined){
            return next(new HttpException(500, "Unable to load new AutoRole.  Please reload page"));
        }
        return res.status(201).send(role);
    }

    private putAutoRole = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const autoRoleId = parseInt(request.params["autoRoleId"]);
        if (isNaN(autoRoleId)){
            return next(new HttpException(404, "AutoRole not found"));
        }
        const role = await request.repo?.AutoRoles.select(request.guildMember?.guildId, autoRoleId);
        if (role === undefined){
            return next(new HttpException(404, "AutoRole not found"));
        }
        const posted = request.body as AutoRoleModel;
        posted.trigger_reverse = posted.trigger_reverse || false;
        posted.prevent_assign = posted.prevent_assign || false;

        if (role.trigger_reverse != posted.trigger_reverse) {
            await request.repo?.AutoRoles.updateReverse(request.guildMember?.guildId, autoRoleId, posted.trigger_reverse ? 1 : 0);
        }
        if (role.prevent_assign != posted.prevent_assign) {
            await request.repo?.AutoRoles.updatePrevent(request.guildMember?.guildId, autoRoleId, posted.prevent_assign ? 1 : 0);
        }

        return res.status(204).send();
    }

    private deleteAutoRole = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const autoRoleId = parseInt(request.params["autoRoleId"]);
        if (isNaN(autoRoleId)){
            return next(new HttpException(404, "AutoRole not found"));
        }
        const role = await request.repo?.AutoRoles.select(request.guildMember?.guildId, autoRoleId);
        if (role === undefined){
            return next(new HttpException(404, "AutoRole not found"));
        }
        await request.repo?.AutoRoles.delete(request.guildMember?.guildId, autoRoleId);
        return res.send(role);
    }
}