import { Guild, } from "discord.js";
import DiscordClient from "../DiscordClient";
import IEventHandler from "./IEventHandler"
import GuildResolver from "../behaviors/GuildResolver";

const handler: IEventHandler = {
    eventName: "guildCreate",
    handler: async (_: DiscordClient, guild: Guild) => {
        await GuildResolver.ResolveGuild(guild);
    }
};

export default handler;