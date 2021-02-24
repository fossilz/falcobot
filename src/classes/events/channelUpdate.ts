import { Channel, GuildChannel } from "discord.js";
import ChannelModel from "../dataModels/ChannelModel";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "channelUpdate",
    handler: async (_: DiscordClient, oldChannel: Channel, newChannel: Channel) => {
        if (!(newChannel instanceof GuildChannel)){
            return;
        }
        let oldC = <GuildChannel>oldChannel;
        let newC = <GuildChannel>newChannel;

        const repo = await RepositoryFactory.getInstanceAsync();

        const c = new ChannelModel(newC);
        await repo.Channels.update(c);

        // Log the new channel creation?
    }
};

export default handler;