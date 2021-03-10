import { MessageReaction, User } from "discord.js";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "messageReactionAdd",
    handler: async (_: DiscordClient, reaction: MessageReaction, user: User) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        // This will likely be used to implement reaction roles
        console.log('messageReactionAdd', { "name": reaction.emoji.name, "id": reaction.emoji.id }, user.username, user.discriminator);
    }
};

export default handler;