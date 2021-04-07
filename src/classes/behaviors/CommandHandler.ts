import { timeStamp } from "console";
import { Guild, Message, GuildMember, TextChannel, DMChannel, NewsChannel, GuildChannel, APIMessageContentResolvable, MessageAdditions, User } from "discord.js";
import NodeCache from "node-cache";
import GuildCache from "../cache/GuildCache";
import ReservedCommandList from '../commands';
import CommandModel from "../dataModels/CommandModel";
import RepositoryFactory from "../RepositoryFactory";
import CommandLog from "./CommandLog";
import { PermissionSetHandler, PermissionCheckResult, PermissionCheckResultType } from './PermissionSetHandler';

export class CommandHandler {
    private static _cache: NodeCache;
    private static _semaphore = false;

    private static GetCache() {
        if (!CommandHandler._cache && !CommandHandler._semaphore) {
            CommandHandler._semaphore = true;
            CommandHandler._cache = new NodeCache();
        }
        return CommandHandler._cache;
    }

    public static async RunCommand(message: Message){
        if (message.guild === null) {
            // Can't execute commands if this isn't in a guild
            return;
        }
        const guild = message.guild;

        // Check for valid command
        const prefix = await this.GetPrefixAsync(guild.id);
        if (prefix === undefined || !this.MessagePrefixed(message, prefix )) {
            return;
        }
        const args = this.GetMessageArguments(message, prefix);
        const firstArg = args.shift();
        if (firstArg === undefined || firstArg.length === 0){
            return;
        }
        const cmd = firstArg.toLowerCase();

        var commandPermissions = await CommandHandler.GetCommandExecutionPermissions(guild, cmd, message.member, message.channel);
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

    private static GetPrefixAsync = async (guild_id: string) : Promise<string|undefined> => {
        const guild = await GuildCache.GetGuildAsync(guild_id);
        return guild?.prefix;
    }

    private static CommandCacheKey = (guild_id: string) : string => {
        return `Commands_${guild_id}`;
    }

    private static GetCommandsAsync = async (guild_id: string) : Promise<CommandModel[]|undefined> => {
        const cache = CommandHandler.GetCache();
        const cacheKey = CommandHandler.CommandCacheKey(guild_id);
        if (!cache.has(cacheKey)){
            const repo = await RepositoryFactory.getInstanceAsync();
            const commands = await repo.Commands.selectAll(guild_id);
            cache.set(cacheKey, commands, 300);
            return commands;
        }
        return cache.get<CommandModel[]>(cacheKey);
    }

    private static GetCommandAsync = async (guild_id: string, commandName: string) : Promise<CommandModel|undefined> => {
        const commandList = await CommandHandler.GetCommandsAsync(guild_id);
        if (commandList === undefined) return;
        const exactMatch = commandList.find(x => x.command.toLowerCase() == commandName.toLowerCase());
        if (exactMatch !== undefined) return exactMatch;
        const aliasMatch = commandList.find(x => x.aliases.includes(commandName.toLowerCase()));
        return aliasMatch;
    }

    public static ClearCommandCache = (guild_id: string) => {
        const cache = CommandHandler.GetCache();
        const cacheKey = CommandHandler.CommandCacheKey(guild_id);
        cache.del(cacheKey);
    }

    private static MessagePrefixed = (message: Message, prefix: string): boolean => {
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
        const command = await CommandHandler.GetCommandAsync(guild.id, commandName);
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

    private static CheckReservedCommandExclusion(command: CommandModel, member: GuildMember | null) : boolean {
        if (member === null) {
            // Not sure how we got here, but no permissions to check... pass
            return true;
        }
        const reservedCommand = ReservedCommandList.find((c) => c.name == command.command);
        if (reservedCommand === undefined){
            // Not a reserved command... can't check exclusive permissions
            return true;
        }
        // Potentially add another for ownerOnly, but that might be unnecessary
        if (reservedCommand.adminOnly && !member.hasPermission('ADMINISTRATOR')){
            return false;
        }
        return true;
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
    private outputChannel: TextChannel | undefined;
    public deleteCommand: boolean;
    private logUsage: boolean;
    public guild: Guild;
    public me: GuildMember;
    public messageMember: GuildMember | null;
    public messageAuthor: User;
    public messageChannel: TextChannel|NewsChannel|DMChannel;
    private messageContent: string;
    private commandName: string|null;

    constructor(message: Message, command: CommandModel | null) {
        if (message.guild === null) throw new Error("Cannot execute command without a guild");
        this.guild = message.guild;
        if (this.guild.me === null) throw new Error("Cannot execute command if bot isn't in the guild");
        this.me = this.guild.me;
        this.messageMember = message.member;
        this.messageAuthor = message.author;
        this.messageChannel = message.channel;
        this.messageContent = message.content;

        this.commandName = command?.command || null;
        this.outputChannel = message.channel instanceof TextChannel ? message.channel : undefined;
        this.deleteCommand = command?.suppressCommand || false;
        this.logUsage = command === null || command.logUsage;
        this.checkOverrideChannel(command);
    }

    private checkOverrideChannel = (command: CommandModel | null) : void => {
        if (command === null || command?.outputChannelId === null || this.guild.me === null) return;
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