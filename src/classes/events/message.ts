import { Message } from "discord.js";
import { CommandHandler } from "../behaviors/CommandHandler";
import DiscordClient from "../DiscordClient";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "message",
    handler: async (_: DiscordClient, message: Message) => {
        if (message.channel.type === 'dm' || !message.channel.viewable || message.author.bot) return;

        // Run a command, if applicable
        await CommandHandler.RunCommand(message);
    }
};

export default handler;