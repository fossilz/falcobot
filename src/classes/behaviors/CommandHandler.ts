import { Guild, Message, GuildMember, TextChannel, DMChannel, NewsChannel, APIMessageContentResolvable, MessageAdditions, User } from "discord.js";
import { CachedCommandModel, CommandCache } from "../cache/CommandCache";
import GuildCache from "../cache/GuildCache";
import { Command } from "../commands/Command";
import CommandModel from "../dataModels/CommandModel";
import CommandLog from "./CommandLog";
import { PermissionSetHandler, PermissionCheckResult, PermissionCheckResultType } from './PermissionSetHandler';

export class CommandHandler {
    public static async RunCommand(message: Message){
        if (message.guild === null) {
            // Can't execute commands if this isn't in a guild
            return;
        }
        const guild = message.guild;

        // Check for valid command
        const args = await CommandHandler.GetCommandArgumentsFromMessage(guild.id, message.content);
        if (args === undefined) return;
        const firstArg = args.shift();
        if (firstArg === undefined || firstArg.length === 0){
            return;
        }
        const cmd = firstArg.toLowerCase();

        await CommandHandler.RunCommandArguments(guild, message, cmd, args, message.member, message.channel, true);
    }

    public static RunCommandArguments = async (guild: Guild, message: Message, command: string, args: string[], executor: GuildMember|null, channel: TextChannel | DMChannel | NewsChannel, rootOnly: boolean) : Promise<void> => {
        const commandPermissions = await CommandHandler.GetCommandExecutionPermissions(guild, command, rootOnly, executor, channel);
        if (commandPermissions === undefined || !commandPermissions.enabled || !commandPermissions.canExecute){
            return;
        }

        let deletedMessage: Message|undefined;
        if (commandPermissions.command.suppressCommand) {
            try {
                deletedMessage = await message.delete();
            } catch (err) {
                console.log('Error clearing command', err);
            }
        }

        // Run the command
        if (commandPermissions.reservedCommand === undefined) {
            console.log('TODO: implement custom command execution:', commandPermissions.command);
            return;
        }
        const execParams = new CommandExecutionParameters(commandPermissions.command, guild, executor, message.author, channel, message.content);
        await commandPermissions.reservedCommand.run(deletedMessage || message, args, execParams);
    }

    private static GetCommandArgumentsFromMessage = async(guild_id: string, content: string) : Promise<string[]|undefined> => {
        const prefix = await CommandHandler.GetPrefixAsync(guild_id);
        if (prefix === undefined || prefix.length < 1) return; // No configured prefix
        if (content.length <= prefix.length) return; // Message can't contain prefix
        if (!content.startsWith(prefix)) return; // Message doesn't start with prefix
        const msgCommandString = content.slice(prefix.length);
        return msgCommandString.split(/ +/g);
    }

    private static GetPrefixAsync = async (guild_id: string) : Promise<string|undefined> => {
        const guild = await GuildCache.GetGuildAsync(guild_id);
        return guild?.prefix;
    }

    private static GetCommandAsync = async (guild_id: string, commandName: string, rootOnly: boolean) : Promise<CachedCommandModel|undefined> => {
        const commandList = rootOnly ? 
            (await CommandCache.GetRootCommandsAsync(guild_id)) :
            (await CommandCache.GetCommandAsync(guild_id));
        if (commandList === undefined) return;
        const exactMatch = commandList.find(x => x.commandModel.command.toLowerCase() == commandName.toLowerCase());
        if (exactMatch !== undefined) return exactMatch;
        const aliasMatch = commandList.find(x => x.commandModel.aliases.includes(commandName.toLowerCase()));
        return aliasMatch;
    }

    public static GetCommandExecutionPermissions = async (guild: Guild, commandName: string, rootOnly: boolean, member: GuildMember | null, channel?: TextChannel | DMChannel | NewsChannel, checkPermissionsIfDisabled?: boolean) : Promise<CommandExecutionPermissions|undefined> => {
        const command = await CommandHandler.GetCommandAsync(guild.id, commandName, rootOnly);
        if (command === undefined) {
            return;
        }
        const perms = new CommandExecutionPermissions(command);
        if (checkPermissionsIfDisabled !== true && !perms.enabled) return perms; // Don't bother checking permissions if we're attempting to execute & command disabled

        var permissionCheck = await PermissionSetHandler.CheckPermissions(guild.id, command.commandModel.permissionset_id, member, channel);
        perms.canExecute = await CommandHandler.CommandCanExecute(permissionCheck, command, guild, member);

        return perms;
    }

    private static async CommandCanExecute(result: PermissionCheckResult, command: CachedCommandModel, guild: Guild, member: GuildMember | null) : Promise<boolean> {
        if (!this.CheckReservedCommandExclusion(command, member)) {
            return false;
        }
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

    private static CheckReservedCommandExclusion(command: CachedCommandModel, member: GuildMember | null) : boolean {
        if (member === null) {
            // Not sure how we got here, but no permissions to check... pass
            return true;
        }
        if (command.reservedCommand === undefined){
            // Not a reserved command... can't check exclusive permissions
            return true;
        }
        // Potentially add another for ownerOnly, but that might be unnecessary
        if (command.reservedCommand.adminOnly && !member.hasPermission('ADMINISTRATOR')){
            return false;
        }
        return true;
    }

    private static CheckReservedCommandDefaultPermissions(command: CachedCommandModel, member: GuildMember | null) : boolean {
        if (member === null) {
            // Not sure how we got here, but no permissions to check... pass
            return true;
        }
        if (command.reservedCommand === undefined){
            // Not a reserved command... permissions allowed
            return true;
        }
        if (command.reservedCommand.defaultUserPermissions.length === 0){
            // No default required user permissions: allow
            return true;
        }
        for(let i=0; i < command.reservedCommand.defaultUserPermissions.length; i++){
            const rc = command.reservedCommand.defaultUserPermissions[i];
            if (!member.hasPermission(rc)) {
                // Member missing expected user permission
                return false;
            }
        }
        return true;
    }
}

export class CommandExecutionPermissions {
    command: CommandModel;
    reservedCommand: Command|undefined;
    enabled: boolean;
    canExecute: boolean;

    constructor(command: CachedCommandModel, enabled?: boolean, canExecute?: boolean) {
        this.command = command.commandModel;
        this.reservedCommand = command.reservedCommand;
        this.enabled = enabled || command.commandModel.enabled || false;
        this.canExecute = canExecute || false;
    }
}

export class CommandExecutionParameters {
    private outputChannel: TextChannel | undefined;
    public deleteCommand: boolean;
    private logUsage: boolean;
    public guild: Guild;
    public me: GuildMember;
    public messageMember: GuildMember | null;
    public messageAuthor: User;
    public messageChannel: TextChannel|NewsChannel|DMChannel;
    private messageContent: string;
    private commandName: string;

    constructor(command: CommandModel, guild: Guild, messageMember: GuildMember | null, messageAuthor: User, messageChannel: TextChannel|NewsChannel|DMChannel, messageContent: string) {
        this.guild = guild;
        if (this.guild.me === null) throw new Error("Cannot execute command if bot isn't in the guild");
        this.me = this.guild.me;
        this.messageMember = messageMember;
        this.messageAuthor = messageAuthor;
        this.messageChannel = messageChannel;
        this.messageContent = messageContent;

        this.commandName = command.command;
        this.outputChannel = messageChannel instanceof TextChannel ? messageChannel : undefined;
        this.deleteCommand = command.suppressCommand || false;
        this.logUsage = command.logUsage;
        this.checkOverrideChannel(command);
    }

    private checkOverrideChannel = (command: CommandModel) : void => {
        if (command.outputChannelId === null || this.guild.me === null) return;
        const channel = this.guild.channels.cache.get(command.outputChannelId);
        if (
            channel === undefined || 
            !(channel instanceof TextChannel) || 
            !channel.viewable || 
            !channel.permissionsFor(this.guild.me)?.has(['SEND_MESSAGES', 'EMBED_LINKS'])
        ){
            return;
        }
        this.outputChannel = channel;
    }

    public sendAsync = async (content: APIMessageContentResolvable | MessageAdditions) : Promise<Message|undefined> => {
        if (this.outputChannel === undefined) return;
        return await this.outputChannel.send(content);
    }

    public errorAsync = async (content: string | undefined) : Promise<Message|undefined> => {
        if (this.outputChannel === undefined) return;
        if (content === undefined) return;
        return await this.outputChannel.send(`ERROR: ${content}`);
    }

    public logAsync = async (commandLog: CommandLog|null) : Promise<void> => {
        if (commandLog === null) return;
        if (!this.logUsage) return;
        await commandLog.send(this.guild);
    }

    public getCommandLog = () : CommandLog|null => {
        if (this.commandName === null) return null;
        return new CommandLog(this.commandName, this.messageAuthor, this.messageChannel, this.messageContent);
    }

    public logDefaultAsync = async () : Promise<void> => {
        await this.logAsync(this.getCommandLog());
    }
}