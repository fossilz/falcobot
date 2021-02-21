import { Role as DRole } from "discord.js";
import Role from '../dataModels/Role';
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "roleCreate",
    handler: async (_: DiscordClient, role: DRole) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        var newRole = new Role(role);
        await repo.Roles.insert(newRole);

        // Log the new role creation?
    }
};

export default handler;