import { Guild } from "discord.js";
import { NewEggShuffleHandler } from "../behaviors/NewEggShuffleHandler";
import ShuffleHistoryModel from "../dataModels/ShuffleHistoryModel";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildDelete",
    handler: async (client: DiscordClient, guild: Guild) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        client.off('neweggShuffle', async (historyModel: ShuffleHistoryModel|undefined) => await NewEggShuffleHandler.handleShuffleForGuildAsync(guild, historyModel));

        await repo.Guilds.deleteGuild(guild.id);
        await repo.Roles.deleteGuild(guild.id);
        await repo.Channels.deleteGuild(guild.id);
        await repo.Commands.deleteGuild(guild.id);
        await repo.PermissionSets.deleteGuild(guild.id);
        await repo.Members.deleteGuild(guild.id);
        await repo.MemberNotes.deleteGuild(guild.id);
        await repo.AutoResponders.deleteGuild(guild.id);
        await repo.MemberReactionRoles.deleteGuild(guild.id);
        await repo.ReactionRoles.deleteGuild(guild.id);
        await repo.AutoRoles.deleteGuild(guild.id);
        await repo.MassRoles.deleteGuild(guild.id);
        await repo.Shuffles.deleteGuild(guild.id);
    }
};

export default handler;