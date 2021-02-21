import { Role as DRole } from "discord.js";
import Role from '../dataModels/Role';
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "roleUpdate",
    handler: async (_: DiscordClient, __: DRole, newRole: DRole) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        var updatedRole = new Role(newRole);
        await repo.Roles.update(updatedRole);

        // Log the role update
    }
};

export default handler;