import { Guild } from "discord.js";

class GuildModel {
    public guild_id: string;
    public name: string;
    public ownerID: string;
    public staffLogChannelID: string|null;
    public muteRoleID: string|null;
    public prefix: string;

    constructor(guild?: Guild){
        this.prefix = '!';
        if (guild === undefined) return;
        this.guild_id = guild.id;
        this.name = guild.name;
        this.ownerID = guild.ownerID;
    }
}

export default GuildModel;