import { Role } from "discord.js";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "roleDelete",
    handler: async (_: DiscordClient, role: Role) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        var guildModel = await repo.Guilds.select(role.guild.id);
        if (guildModel?.muteRoleID === role.id) {
            await repo.Guilds.updateMuteRole(role.guild.id, null);
        }

        await repo.Roles.delete(role.guild.id, role.id);

        // Log the role deletion?
    }
};

export default handler;