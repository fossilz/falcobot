import { Guild as DGuild, Role as DRole } from "discord.js";
import Guild from '../dataModels/Guild';
import Role from '../dataModels/Role';
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildCreate",
    handler: async (_: DiscordClient, guild: DGuild) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        var newGuild = new Guild(guild);
        await repo.Guilds.insert(newGuild);

        guild.roles.cache.forEach(async (role: DRole) => {
            var newRole = new Role(role);
            await repo.Roles.insert(newRole);
        });
    }
};

export default handler;