import { Channel, GuildChannel, PartialDMChannel } from "discord.js";
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "channelDelete",
    handler: async (_: DiscordClient, channel: Channel|PartialDMChannel) => {
        if (!(channel instanceof GuildChannel)){
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();
        await repo.Channels.delete(channel.id);

        // Log the new channel creation?
    }
};

export default handler;