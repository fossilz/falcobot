import { GuildMember } from "discord.js";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildMemberUpdate",
    handler: async (_: DiscordClient, oldMember: GuildMember, newMember: GuildMember) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        if (oldMember.nickname !== newMember.nickname) {
            await repo.Members.updateNickname(newMember.guild.id, newMember.user.id, newMember.nickname);
        }
    }
};

export default handler;