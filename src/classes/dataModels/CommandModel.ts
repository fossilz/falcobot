import { Command } from "../commands/Command";

class CommandModel {
    public guild_id: string;
    public command: string; // unique command name
    public reserved: boolean; // marks a reserved command name (code-based, can be enabled/disabled but not deleted)
    public enabled: boolean;
    public logUsage: boolean; // write to staff log channel (if configured in guild settings) when used
    public permissionset_id: number|null;
    public logAttempts: boolean; // Log attempts to use this command that fail due to insufficient permissions (if logging enabled)
    public fallbackCommand: string|null; // (Optional) name of a command to use, instead of this one, if insufficient permissions
    public outputChannelId: string|null; // (Optional) ID of channel to redirect command output to
    public suppressCommand: boolean; // Delete the triggering command message

    constructor(guild_id: string, command?: Command){
        this.guild_id = guild_id;
        if (command !== undefined){
            this.command = command.name;
            this.reserved = true;
            this.enabled = true;
            this.logUsage = command.logByDefault;
            this.logAttempts = false;
            this.suppressCommand = command.suppressByDefault;
        } else {
            this.reserved = false;
            this.enabled = false;
            this.logUsage = false;
            this.logAttempts = false;
            this.suppressCommand = false;
        }
        this.permissionset_id = null;
        this.fallbackCommand = null;
        this.outputChannelId = null;
    }
}

export default CommandModel;