import { MessageReaction, User } from "discord.js";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "messageReactionAdd",
    handler: async (_: DiscordClient, __: MessageReaction, ___: User) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        // This will likely be used to implement reaction roles
    }
};

export default handler;