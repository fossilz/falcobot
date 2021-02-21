import { Role } from "discord.js";
import RoleModel from '../dataModels/RoleModel';
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "roleCreate",
    handler: async (_: DiscordClient, role: Role) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        var newRole = new RoleModel(role);
        await repo.Roles.insert(newRole);

        // Log the new role creation?
    }
};

export default handler;