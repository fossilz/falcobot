import { GuildMember } from "discord.js";
import AutoRoleHandler from "../behaviors/AutoRoleHandler";
import { MemberNoteHelper } from "../behaviors/MemberNoteHelper";
import MemberModel from "../dataModels/MemberModel";
import { NoteType } from "../dataModels/MemberNoteModel";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildMemberAdd",
    handler: async (_: DiscordClient, member: GuildMember) => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const memberModel = new MemberModel(member);
        await repo.Members.insert(memberModel);

        await MemberNoteHelper.AddUserNote(member.guild.id, member.user.id, NoteType.Note, `Member ${member.user.username}#${member.user.discriminator} joined.`);

        await AutoRoleHandler.OnGuildJoin(member);
    }
};

export default handler;