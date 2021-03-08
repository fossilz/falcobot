import { GuildMember } from "discord.js";
import { MemberNoteHelper } from "../behaviors/MemberNoteHelper";
import { NoteType } from "../dataModels/MemberNoteModel";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildMemberUpdate",
    handler: async (_: DiscordClient, oldMember: GuildMember, newMember: GuildMember) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        if (oldMember.nickname !== newMember.nickname) {
            await repo.Members.updateNickname(newMember.guild.id, newMember.user.id, newMember.nickname);
            if (newMember.nickname) {
                await MemberNoteHelper.AddUserNote(newMember.guild.id, newMember.user.id, NoteType.Note, `Member ${newMember.user.username}#${newMember.user.discriminator} changed nickname to ${newMember.nickname}.`);
            } else {
                await MemberNoteHelper.AddUserNote(newMember.guild.id, newMember.user.id, NoteType.Note, `Member ${newMember.user.username}#${newMember.user.discriminator} cleared nickname.`);
            }
        }
        if (oldMember.user.username !== newMember.user.username || oldMember.user.discriminator !== newMember.user.discriminator) {
            await MemberNoteHelper.AddUserNote(newMember.guild.id, newMember.user.id, NoteType.Note, `Member ${oldMember.user.username}#${oldMember.user.discriminator} renamed to ${newMember.user.username}#${newMember.user.discriminator}.`);
        }
    }
};

export default handler;