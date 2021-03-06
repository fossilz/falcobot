import { TextChannel, VoiceChannel, CategoryChannel } from "discord.js";
import GuildResolver from "../behaviors/GuildResolver";
import ChannelModel from '../dataModels/ChannelModel';
import DiscordClient from "../DiscordClient";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"

const handler: IEventHandler = {
    eventName: "channelCreate",
    handler: async (_: DiscordClient, channel: TextChannel|VoiceChannel|CategoryChannel) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        if (!(channel instanceof TextChannel || channel instanceof VoiceChannel || channel instanceof CategoryChannel)){
            return;
        }

        const c = new ChannelModel(channel);
        await repo.Channels.insert(c);

        const muteRole = GuildResolver.GetMuteRoleForGuild(channel.guild);
        await GuildResolver.AddChannelToMuteRole(muteRole, channel, channel.guild.me);

        // Log the new channel creation?
    }
};

export default handler;