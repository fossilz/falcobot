import { GuildChannel, Guild, Role } from "discord.js";
import ChannelModel from "../dataModels/ChannelModel";
import GuildModel from '../dataModels/GuildModel';
import RoleModel from '../dataModels/RoleModel';
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildCreate",
    handler: async (_: DiscordClient, guild: Guild) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        var newGuild = new GuildModel(guild);
        await repo.Guilds.insert(newGuild);

        guild.roles.cache.forEach(async (role: Role) => {
            var newRole = new RoleModel(role);
            await repo.Roles.insert(newRole);
        });

        guild.channels.cache.forEach(async (channel: GuildChannel) => {
            var c = new ChannelModel(channel);
            await repo.Channels.insert(c);
        });
    }
};

export default handler;