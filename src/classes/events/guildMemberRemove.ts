import { GuildMember } from "discord.js";
import { MemberNoteHelper } from "../behaviors/MemberNoteHelper";
import { NoteType } from "../dataModels/MemberNoteModel";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildMemberRemove",
    handler: async (_: DiscordClient, member: GuildMember) => {
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.Members.updateDeleted(member.guild.id, member.user.id, true);
        
        await MemberNoteHelper.AddUserNote(member.guild.id, member.user.id, NoteType.Note, `Member ${member.user.username}#${member.user.discriminator} left.`);
    }
};

export default handler;