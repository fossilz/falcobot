import { GuildMember } from "discord.js";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildMemberRemove",
    handler: async (_: DiscordClient, member: GuildMember) => {
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.Members.updateDeleted(member.guild.id, member.user.id, true);
    }
};

export default handler;