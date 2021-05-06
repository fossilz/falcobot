import { Response, NextFunction } from "express";
import RequestWithGuildMember from "../interfaces/requestWithGuildMember.interface";
import { API_STATIC_USERID } from "../../config";

export default async function authGuild(req: RequestWithGuildMember, res: Response, next: NextFunction) {
    const userId = req.user?.userId;
    if (userId === undefined) {
        res.sendStatus(401);
        return;
    }
    const guildId = req.params["guildid"];
    if (guildId === undefined || guildId === null || guildId === ""){
        res.sendStatus(403);
        return;
    }

    // Hard-coded user wins!
    if (userId === API_STATIC_USERID){
        req.guildMember = {
            userId: userId,
            guildId: guildId 
        };
        next();
        return;
    }

    // Implement proper "does this user have access to this guild" support
    res.sendStatus(403);
}