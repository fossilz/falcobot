import { Role } from "discord.js";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "roleDelete",
    handler: async (_: DiscordClient, role: Role) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        await repo.Roles.delete(role.id);

        // Log the role deletion?
    }
};

export default handler;