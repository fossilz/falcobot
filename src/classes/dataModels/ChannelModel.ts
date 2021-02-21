import { GuildChannel } from "discord.js";

class ChannelModel {
    public guild_id: string;
    public channel_id: string;
    public name: string;
    public type: string;
    public parentID: string | null;
    public deleted: boolean;

    constructor(channel?: GuildChannel){
        if (channel === undefined) return;
        this.guild_id = channel.guild.id;
        this.channel_id = channel.id;
        this.name = channel.name;
        this.type = channel.type;
        this.parentID = channel.parentID;
        this.deleted = channel.deleted;
    }
}

export default ChannelModel;