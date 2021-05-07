import { Response, NextFunction } from "express";
import GuildRequest from "../interfaces/guildRequest.interface";
import AuthenticationException from "../exceptions/authenticationException";
import InvalidGuildException from "../exceptions/invalidGuildException";
import RepositoryFactory from "../../classes/RepositoryFactory";
import { API_STATIC_USERID } from "../../config";

export default async function authGuild(req: GuildRequest, _: Response, next: NextFunction) {
    try {
        await authorizeUserForGuildAsync(req);
        next();
    } catch (e) {
        next(e);
    }
}

async function authorizeUserForGuildAsync(req: GuildRequest) {
    const userId = req.user?.userId;
    if (userId === undefined) {
        throw new AuthenticationException();
    }
    const guildId = req.params["guildid"];
    if (guildId === undefined || guildId === null || guildId === ""){
        throw new InvalidGuildException(guildId);
    }

    // Hard-coded user wins!
    if (userId === API_STATIC_USERID){
        await resolveGuildAsync(req, userId, guildId);
        return;
    }

    // Implement proper "does this user have access to this guild" support
    throw new InvalidGuildException(guildId);
}

async function resolveGuildAsync(req: GuildRequest, userId: string, guildId: string) {
    req.guildMember = {
        userId: userId,
        guildId: guildId 
    };
    req.repo = await RepositoryFactory.getInstanceAsync();
    req.guild = await req.repo.Guilds.select(guildId);
    if (req.guild === undefined) {
        throw new InvalidGuildException(guildId);
    }
}