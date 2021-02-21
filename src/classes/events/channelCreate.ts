import { TextChannel, VoiceChannel, CategoryChannel } from "discord.js";
import ChannelModel from '../dataModels/ChannelModel';
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "channelCreate",
    handler: async (_: DiscordClient, channel: TextChannel|VoiceChannel|CategoryChannel) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        const c = new ChannelModel(channel);
        await repo.Channels.insert(c);

        // Log the new channel creation?
    }
};

export default handler;