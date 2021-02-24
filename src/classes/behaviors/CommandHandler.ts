import { Guild, Message, GuildMember } from "discord.js";
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

        // Get command model from sqlite
        var command = await repo.Commands.select(message.guild.id, cmd);
        // Abort if bad command or disabled
        if (command === undefined || !command.enabled) {
            return;
        }

        // Check the permissions
        var permissionCheck = await PermissionSetHandler.CheckPermissions(message.guild.id, command.permissionset_id, message.member, message.channel);
        if (!await CommandHandler.CommandCanExecute(permissionCheck, command, message.guild, message.member)){
            return;
        }

        // Run the command
        const reservedCommand = ReservedCommandList.find((c) => c.name === command?.command);
        if (reservedCommand === undefined) {
            console.log('TODO: implement custom command execution:', command);
            return;
        }
        await reservedCommand.run(message, args);
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
        console.log('msg command string', msgCommandString);
        return msgCommandString.split(/ +/g);
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