import { Message } from "discord.js";
import DiscordClient from "../DiscordClient";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "message",
    handler: async (_: DiscordClient, message: Message) => {
        if (message.channel.type === 'dm' || !message.channel.viewable || message.author.bot) return;

        //console.log('Message Received', message, client);
        //console.log(message.channel.guild.roles);
    }
};

export default handler;