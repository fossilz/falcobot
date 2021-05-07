import { Router, Response, NextFunction } from "express";
import AutoResponderReactionModel from "../../classes/dataModels/AutoResponderReactionModel";
import AutoResponderModel from "../../classes/dataModels/AutoResponderModel";
import HttpException from "../exceptions/httpException";
import InvalidGuildException from "../exceptions/invalidGuildException";
import ApiController from "../interfaces/apiController.interface";
import GuildRequest from "../interfaces/guildRequest.interface";

export default class AutoRespondersController implements ApiController {
    public basePath: string = "/autoresponders";
    public router = Router({mergeParams: true});

    constructor(){
        this.initializeRoutes();
    }

    private initializeRoutes = () => {
        this.router.get("/", this.getAutoResponders);
        this.router.get("/:autoResponderId", this.getAutoResponder);
        this.router.post("/", this.postAutoResponder);
        this.router.put("/:autoResponderId", this.putAutoResponder);
        this.router.delete("/:autoResponderId", this.deleteAutoResponder);
        // Reactions
        this.router.get("/:autoResponderId/reactions", this.getAutoResponderReactions);
        this.router.post("/:autoResponderId/reactions", this.postAutoResponderReaction);
        this.router.delete("/:autoResponderId/reactions/:autoResponderReactionId", this.deleteAutoResponderReaction);
    }

    private getAutoResponders = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const responders = await request.repo?.AutoResponders.selectAll(request.guildMember?.guildId);
        return res.send(responders);
    }

    private getAutoResponder = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const autoResponderId = parseInt(request.params["autoResponderId"]);
        if (isNaN(autoResponderId)){
            return next(new HttpException(404, "AutoResponder not found"));
        }
        const responder = await request.repo?.AutoResponders.select(request.guildMember?.guildId, autoResponderId);
        if (responder === undefined){
            return next(new HttpException(404, "AutoResponder not found"));
        }
        return res.send(responder);
    }

    private postAutoResponder = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const posted = request.body as AutoResponderModel;
        if (posted.pattern === undefined || posted.enabled === undefined){
            return next(new HttpException(400, "Invalid autoresponder"));
        }
        try {
            const _ = new RegExp(posted.pattern,'g');
        } catch (e){
            return next(new HttpException(400, "Invalid Regular Expression for pattern"));
        }
        posted.message = posted.message || null;
        posted.permissionset_id = posted.permissionset_id || null;

        let autoresponder_id: number|undefined = undefined;
        try {
            autoresponder_id = await request.repo?.AutoResponders.insert(request.guildMember?.guildId, posted);
        } catch (e){
            return next(new HttpException(500, "Error while attempting to insert.  Please try again"));
        }
        if (autoresponder_id == undefined){
            return next(new HttpException(500, "Error while attempting to insert.  Please try again"));
        }
        const responder = await request.repo?.AutoResponders.select(request.guildMember?.guildId, autoresponder_id);
        if (responder === undefined){
            return next(new HttpException(500, "Unable to load new AutoResponder.  Please reload page"));
        }
        return res.status(201).send(responder);
    }

    private putAutoResponder = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const autoResponderId = parseInt(request.params["autoResponderId"]);
        if (isNaN(autoResponderId)){
            return next(new HttpException(404, "AutoResponder not found"));
        }
        const responder = await request.repo?.AutoResponders.select(request.guildMember?.guildId, autoResponderId);
        if (responder === undefined){
            return next(new HttpException(404, "AutoResponder not found"));
        }
        const posted = request.body as AutoResponderModel;
        if (posted.pattern === undefined || posted.enabled === undefined){
            return next(new HttpException(400, "Invalid autoresponder"));
        }
        try {
            const _ = new RegExp(posted.pattern,'g');
        } catch (e){
            return next(new HttpException(400, "Invalid Regular Expression for pattern"));
        }
        responder.enabled = posted.enabled;
        responder.message = posted.message || null;
        responder.pattern = posted.pattern;
        responder.permissionset_id = posted.permissionset_id || null;

        await request.repo?.AutoResponders.update(request.guildMember?.guildId, responder);

        return res.status(204).send();
    }

    private deleteAutoResponder = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const autoResponderId = parseInt(request.params["autoResponderId"]);
        if (isNaN(autoResponderId)){
            return next(new HttpException(404, "AutoResponder not found"));
        }
        const responder = await request.repo?.AutoResponders.select(request.guildMember?.guildId, autoResponderId);
        if (responder === undefined){
            return next(new HttpException(404, "AutoResponder not found"));
        }
        await request.repo?.AutoResponders.delete(request.guildMember?.guildId, autoResponderId);
        return res.send(responder);
    }
    
    private getAutoResponderReactions = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const autoResponderId = parseInt(request.params["autoResponderId"]);
        if (isNaN(autoResponderId)){
            return next(new HttpException(404, "AutoResponder not found"));
        }
        const reactions = await request.repo?.AutoResponders.selectReactions(request.guildMember?.guildId, autoResponderId);
        if (reactions === undefined){
            return next(new HttpException(404, "AutoResponder reactions not found"));
        }
        return res.send(reactions);
    }
    
    private postAutoResponderReaction = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const autoResponderId = parseInt(request.params["autoResponderId"]);
        if (isNaN(autoResponderId)){
            return next(new HttpException(404, "AutoResponder not found"));
        }
        const responder = await request.repo?.AutoResponders.select(request.guildMember?.guildId, autoResponderId);
        if (responder === undefined){
            return next(new HttpException(404, "AutoResponder not found"));
        }
        const posted = request.body as AutoResponderReactionModel;
        if (posted.reaction === undefined){
            return next(new HttpException(400, "Invalid reaction"));
        }
        posted.guild_id = request.guildMember?.guildId;
        posted.autoresponder_id = autoResponderId;
        const autoresponderreaction_id = await request.repo?.AutoResponders.addReaction(request.guildMember?.guildId, autoResponderId, posted.reaction);
        if (autoresponderreaction_id === undefined) {
            return next(new HttpException(500, "Error while attempting to insert.  Please try again"));
        }
        posted.autoresponderreaction_id = autoresponderreaction_id;
        return res.status(201).send(posted);
    }

    private deleteAutoResponderReaction = async (request: GuildRequest, res: Response, next: NextFunction) => {
        if (request.guildMember?.guildId === undefined) return next(new InvalidGuildException(""));
        const autoResponderReactionId = parseInt(request.params["autoResponderReactionId"]);
        if (isNaN(autoResponderReactionId)){
            return next(new HttpException(404, "AutoResponder Reaction not found"));
        }
        
        await request.repo?.AutoResponders.removeReaction(request.guildMember?.guildId, autoResponderReactionId);
        return res.status(204).send();
    }
}