import { Guild as DGuild } from "discord.js";

class Guild {
    public guild_id: string;
    public name: string;
    public ownerID: string;
    public prefix: string;

    constructor(guild?: DGuild){
        this.prefix = '!';
        if (guild === undefined) return;
        this.guild_id = guild.id;
        this.name = guild.name;
        this.ownerID = guild.ownerID;
    }
}

export default Guild;