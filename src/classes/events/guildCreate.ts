import { Guild, } from "discord.js";
import DiscordClient from "../DiscordClient";
import IEventHandler from "./IEventHandler"
import GuildResolver from "../behaviors/GuildResolver";

const handler: IEventHandler = {
    eventName: "guildCreate",
    handler: async (client: DiscordClient, guild: Guild) => {
        await GuildResolver.ResolveGuild(client, guild);
    }
};

export default handler;