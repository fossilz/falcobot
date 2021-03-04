import { Guild, Message, GuildMember, TextChannel, DMChannel, NewsChannel, GuildChannel } from "discord.js";
import ReservedCommandList from '../commands';
import CommandModel from "../dataModels/CommandModel";
import Repository from "../Repository";
import RepositoryFactory from "../RepositoryFactory";
import { PermissionSetHandler, PermissionCheckResult, PermissionCheckResultType } from './PermissionSetHandler';

export class CommandHandler {
    public static async RunCommand(message: Message){
        if (message.guild === null) {
            // Can't execute commands if this isn't in a guild
            return;
        }
        const repo = await RepositoryFactory.getInstanceAsync();

        // Check for valid command
        const prefix = await this.GetPrefix(message.guild, repo);
        if (prefix === null || !this.MessagePrefixed(message, prefix )) {
            return;
        }
        const args = this.GetMessageArguments(message, prefix);
        const firstArg = args.shift();
        if (firstArg === undefined || firstArg.length === 0){
            return;
        }
        const cmd = firstArg.toLowerCase();

        var commandPermissions = await CommandHandler.GetCommandExecutionPermissions(message.guild, cmd, message.member, message.channel);
        if (!commandPermissions.enabled || !commandPermissions.canExecute){
            return;
        }

        let deletedMessage: Message|undefined;
        if (commandPermissions.command?.suppressCommand) {
            try {
                deletedMessage = await message.delete();
            } catch (err) {
                console.log('Error clearing command', err);
            }
        }

        // Run the command
        const reservedCommand = ReservedCommandList.find((c) => c.name === commandPermissions.command?.command);
        if (reservedCommand === undefined) {
            console.log('TODO: implement custom command execution:', commandPermissions.command);
            return;
        }
        const execParams = new CommandExecutionParameters(message, commandPermissions.command);
        await reservedCommand.run(deletedMessage || message, args, execParams);
    }

    private static async GetPrefix(guild: Guild, repo: Repository) : Promise<string|null> {
        // We might want to cache this in future to avoid db calls on ever message
        const gm = await repo.Guilds.select(guild.id);
        if (gm === undefined){
            return null;
        }
        return gm.prefix;
    }

    private static MessagePrefixed(message: Message, prefix: string): boolean {
        if (prefix.length === 0){
            return false;
        }
        if (message.content.length <= prefix.length){
            return false;
        }
        if (!message.content.startsWith(prefix)){
            return false;
        }
        return true;
    }

    private static GetMessageArguments(message: Message, prefix: string): string[] {
        const msgCommandString = message.content.slice(prefix.length);
        return msgCommandString.split(/ +/g);
    }

    public static async GetCommandExecutionPermissions(guild: Guild, commandName: string, member: GuildMember | null, channel?: TextChannel | DMChannel | NewsChannel, checkPermissionsIfDisabled?: boolean) {
        const repo = await RepositoryFactory.getInstanceAsync();
        const command = await repo.Commands.select(guild.id, commandName);
        if (command === undefined) {
            return new CommandExecutionPermissions(null);
        }
        const perms = new CommandExecutionPermissions(command);
        if (checkPermissionsIfDisabled !== true && !perms.enabled) return perms; // Don't bother checking permissions if we're attempting to execute & command disabled

        var permissionCheck = await PermissionSetHandler.CheckPermissions(guild.id, command.permissionset_id, member, channel);
        perms.canExecute = await CommandHandler.CommandCanExecute(permissionCheck, command, guild, member);

        return perms;
    }

    private static async CommandCanExecute(result: PermissionCheckResult, command: CommandModel, guild: Guild, member: GuildMember | null) : Promise<boolean> {
        if (result.result == PermissionCheckResultType.Pass) {
            return true;
        }
        if (result.result == PermissionCheckResultType.NoPermissions) {
            return this.CheckReservedCommandDefaultPermissions(command, member);
        }
        // We've failed, but what do we do with that?
        // TODO : Implement command failure behaviors:
        console.log('Command ', command, 'failed.  Log for guild', guild);
        // Log attempt...
        // Execute fallback
        return false;
    }

    private static CheckReservedCommandDefaultPermissions(command: CommandModel, member: GuildMember | null) : boolean {
        if (member === null) {
            // Not sure how we got here, but no permissions to check... pass
            return true;
        }
        const reservedCommand = ReservedCommandList.find((c) => c.name == command.command);
        if (reservedCommand === undefined){
            // Not a reserved command... permissions allowed
            return true;
        }
        if (reservedCommand.defaultUserPermissions.length === 0){
            // No default required user permissions: allow
            return true;
        }
        for(let i=0; i < reservedCommand.defaultUserPermissions.length; i++){
            const rc = reservedCommand.defaultUserPermissions[i];
            if (!member.hasPermission(rc)) {
                // Member missing expected user permission
                return false;
            }
        }
        return true;
    }
}

export class CommandExecutionPermissions {
    command: CommandModel | null;
    enabled: boolean;
    canExecute: boolean;

    constructor(command: CommandModel | null, enabled?: boolean, canExecute?: boolean) {
        this.command = command;
        this.enabled = enabled || command?.enabled || false;
        this.canExecute = canExecute || false;
    }
}

export class CommandExecutionParameters {
    outputChannel: TextChannel | undefined;
    deleteCommand: boolean;
    logUsage: boolean;

    constructor(message: Message, command: CommandModel | null) {
        this.outputChannel = message.channel instanceof TextChannel ? message.channel : undefined;
        this.deleteCommand = command?.suppressCommand || false;
        this.logUsage = command === null || command.logUsage;
        if (message.guild !== null) {
            this.checkOverrideChannel(message.guild, command);
        }
    }

    private checkOverrideChannel = (guild: Guild, command: CommandModel | null) : void => {
        if (command === null || command?.outputChannelId === null || guild.me === null) return;
        const channel = guild.channels.cache.get(command.outputChannelId);
        if (
            channel === undefined || 
            !(channel instanceof TextChannel) || 
            !channel.viewable || 
            !channel.permissionsFor(guild.me)?.has(['SEND_MESSAGES', 'EMBED_LINKS'])
        ){
            return;
        }
        this.outputChannel = channel;
    }
}