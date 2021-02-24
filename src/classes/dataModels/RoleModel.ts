import { Role } from "discord.js";

class RoleModel {
    public guild_id: string;
    public role_id: string;
    public name: string;
    public permissions: number;
    public color: number;
    public hoist: boolean;
    public managed: boolean;
    public mentionable: boolean;
    public deleted: boolean;

    constructor(role?: Role){
        if (role === undefined) return;
        this.guild_id = role.guild.id;
        this.role_id = role.id;
        this.name = role.name;
        this.permissions = role.permissions.bitfield;
        this.color = role.color;
        this.hoist = role.hoist;
        this.managed = role.managed;
        this.mentionable = role.mentionable;
        this.deleted = role.deleted;
    }
}

export default RoleModel;