import { Role } from "discord.js";
import RoleModel from '../dataModels/RoleModel';
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "roleUpdate",
    handler: async (_: DiscordClient, __: Role, newRole: Role) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        var updatedRole = new RoleModel(newRole);
        await repo.Roles.update(updatedRole);

        // Log the role update
    }
};

export default handler;