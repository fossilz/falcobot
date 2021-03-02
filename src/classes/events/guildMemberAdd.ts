import { GuildMember } from "discord.js";
import MemberModel from "../dataModels/MemberModel";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "guildMemberAdd",
    handler: async (_: DiscordClient, member: GuildMember) => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const memberModel = new MemberModel(member);
        await repo.Members.insert(memberModel);
    }
};

export default handler;