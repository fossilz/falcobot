import { Guild } from "discord.js";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildDelete",
    handler: async (_: DiscordClient, guild: Guild) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        await repo.Guilds.deleteGuild(guild.id);
        await repo.Roles.deleteGuild(guild.id);
    }
};

export default handler;