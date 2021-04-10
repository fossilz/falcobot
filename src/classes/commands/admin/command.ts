import { Guild, GuildMember, Message, MessageEmbed, TextChannel } from "discord.js";
import { CommandHandler, CommandExecutionParameters } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import { Command } from "../Command";
import CommandModel from "../../dataModels/CommandModel";
import ReservedCommandList from '../';
import { CommandCache } from "../../cache/CommandCache";

export class CommandCommand extends Command {
    public static readonly CommandName: string = 'command';

    constructor(){
        super({
            name: CommandCommand.CommandName,
            childCommands: [
                CommandEnableCommand.CommandName,
                CommandSuppressCommand.CommandName,
                CommandLogCommand.CommandName,
                CommandLogAttemptsCommand.CommandName,
                CommandOutputCommand.CommandName,
                CommandAliasCommand.CommandName,
                CommandPermissionSetCommand.CommandName
            ],
            category: 'admin',
            usage: 'command <commandname> [enable|disable|log|logattempts|output|alias|permissionset]',
            description: 'Get command information',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'], // This command /defaults/ to Admin, but it can be useful for others, so it does not carry adminOnly
            examples: ['command', 'command purge', 'command superping disable'],
            logByDefault: false,
            aliases: ['cmd']
        });
    }

    run = async (message: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (commandExec.messageMember === null) return;
        const guild = commandExec.guild;
        const member = commandExec.messageMember;
        if (guild.me === null) return;

        const repo = await RepositoryFactory.getInstanceAsync();
        const commands = await repo.Commands.selectAll(guild.id);

        if (args.length === 0) {
            await commandExec.errorAsync('Please specify a command.');
            return;
        }

        const commandName = args.shift();
        if (commandName === undefined || commandName === '') {
            await commandExec.errorAsync('Please specify a command.');
            return;
        }

        const cmdModel = await CommandCommand.getAllowedCommand(commands.find(x => x.command == commandName), guild, member);
        if (cmdModel === undefined){
            await commandExec.errorAsync('Unknown command.');
            return;
        }

        if (args.length === 0) {
            await CommandCommand.displayCommandInfoAsync(guild, cmdModel, commandExec);
            return;
        }

        const settingArg = args.shift();
        if (settingArg === undefined) {
            await commandExec.errorAsync('Unknown command argument.  Allowed arguments: enable, disable, suppress, log, logattempts, output clear|<channel ID/mention>, alias +|- <alias>, permissionset clear|<set ID>');
            return;
        }

        switch(settingArg) {
            case 'enable':
            case 'disable':
                await this.runChildCommandAsync(CommandEnableCommand.CommandName, message, [cmdModel.command, settingArg], commandExec);
                return;
            case 'suppress':
                await this.runChildCommandAsync(CommandSuppressCommand.CommandName, message, [cmdModel.command], commandExec);
                return;
            case 'log':
                await this.runChildCommandAsync(CommandLogCommand.CommandName, message, [cmdModel.command], commandExec);
                return;
            case 'logattempts':
                await this.runChildCommandAsync(CommandLogAttemptsCommand.CommandName, message, [cmdModel.command], commandExec);
                return;
            case 'output':
                await this.runChildCommandAsync(CommandOutputCommand.CommandName, message, [cmdModel.command].concat(args), commandExec);
                return;
            case 'alias':
                await this.runChildCommandAsync(CommandAliasCommand.CommandName, message, [cmdModel.command].concat(args), commandExec);
                return;
            case 'permissionset':
                await this.runChildCommandAsync(CommandPermissionSetCommand.CommandName, message, [cmdModel.command].concat(args), commandExec);
                return;
        }

        await commandExec.logDefaultAsync();
    }

    private static displayCommandInfoAsync = async (guild: Guild, cmdModel: CommandModel, commandExec: CommandExecutionParameters) : Promise<void> => {
        if (guild.me === null) return;
        const repo = await RepositoryFactory.getInstanceAsync();
        const embed = new MessageEmbed()
            .setTimestamp()
            .setColor(guild.me.displayHexColor);
        const rCommand = ReservedCommandList.find(rc => rc.name == cmdModel.command);
        if (rCommand != undefined){
            embed.setTitle(rCommand.name).setDescription(rCommand.description);
        } else {
            // Custom command
            embed.setTitle(cmdModel.command).setDescription("This is a custom command");
        }
        embed.addField('Enabled', cmdModel.enabled ? 'Yes' : 'No', true);
        embed.addField('Log Usage', cmdModel.logUsage ? 'Yes' : 'No', true);
        embed.addField('Log Attempts', cmdModel.logAttempts ? 'Yes' : 'No', true);
        embed.addField('Suppressed', cmdModel.suppressCommand ? 'Yes' : 'No', true);
        if (rCommand != undefined && rCommand.adminOnly){
            embed.addField('Admin Only', 'Yes', true);
        }
        if (rCommand != undefined && rCommand.parentCommand !== undefined) {
            embed.addField('Parent Command', rCommand.parentCommand, true);
        }
        if (cmdModel.aliases.length > 0){
            embed.addField('Aliases', cmdModel.aliases.join(', '), true);
        }
        if (cmdModel.permissionset_id !== null) {
            const pset = await repo.PermissionSets.select(guild.id, cmdModel.permissionset_id);
            if (pset !== undefined){
                embed.addField('Permission Set', `${pset.set_id} (${pset.name})`, true);
            }
        }
        if (rCommand != undefined && rCommand.childCommands !== undefined && rCommand.childCommands.length > 0) {
            embed.addField('Child Commands', rCommand.childCommands.join('\n'));
        }
        const outputChannel = CommandCommand.tryGetChannel(guild, cmdModel.outputChannelId);
        if (outputChannel !== undefined){
            embed.addField('Output redirected to', outputChannel);
        }

        await commandExec.sendAsync(embed);
    }

    private static tryGetChannel = (guild: Guild, channelId: string|null) : TextChannel|undefined => {
        if (channelId === null) return;
        const cid = Command.extractChannelIDFromMention(channelId) || channelId;
        const channel = guild.channels.cache.get(cid);
        if (channel === undefined || !(channel instanceof TextChannel)) return;
        return channel;
    }

    private static getAllowedCommand = async (command: CommandModel | undefined, guild: Guild, member: GuildMember|null) : Promise<CommandModel|undefined> => {
        if (command === undefined) return;
        var pModel = await CommandHandler.GetCommandExecutionPermissions(guild, command.command, false, member, undefined, true);
        if (pModel === undefined) return;
        if (!pModel.canExecute) return;
        if (pModel.command === null) return;
        return pModel.command;
    }
}

export class CommandEnableCommand extends Command {
    public static readonly CommandName: string = 'command.enable'; // This is command.enable but covers enable and disable

    constructor(){
        super({
            name: CommandEnableCommand.CommandName,
            parentCommand: CommandCommand.CommandName,
            category: 'admin',
            usage: 'command <commandname> [enable|disable]',
            description: 'Enable or disable a command',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'], // This command /defaults/ to Admin, but it can be useful for others, so it does not carry adminOnly
            examples: ['command purge enable', 'command superping disable'],
            logByDefault: true,
            aliases: ['cmd']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (args.length !== 2) return;
        const guild = commandExec.guild;

        const commandName = args.shift();
        if (commandName === undefined) return;
        const toggle = args.shift();
        const repo = await RepositoryFactory.getInstanceAsync();

        const commandLog = commandExec.getCommandLog();

        if (toggle === "enable") {
            await repo.Commands.updateEnabled(guild.id, commandName, true);
            await commandExec.sendAsync(`Command ${commandName} enabled.`);
            commandLog?.addField('Enabled', commandName);
        }
        if (toggle === "disable") {
            await repo.Commands.updateEnabled(guild.id, commandName, false);
            await commandExec.sendAsync(`Command ${commandName} enabled.`);
            commandLog?.addField('Enabled', commandName);
        }
        CommandCache.ClearCache(guild.id);
        await commandExec.logAsync(commandLog);
    }
}

export class CommandSuppressCommand extends Command {
    public static readonly CommandName: string = 'command.suppress';
    
    constructor(){
        super({
            name: CommandSuppressCommand.CommandName,
            parentCommand: CommandCommand.CommandName,
            category: 'admin',
            usage: 'command <commandname> suppress',
            description: 'Enable or disables removal of the original command message on use',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            examples: ['command ban suppress'],
            logByDefault: true,
            aliases: ['cmd']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (args.length !== 1) return;
        const guild = commandExec.guild;

        const commandName = args.shift();
        if (commandName === undefined) return;

        const repo = await RepositoryFactory.getInstanceAsync();
        const cmdModel = await repo.Commands.select(guild.id,commandName);
        if (cmdModel === undefined) return;

        const newSuppressSetting = !cmdModel.suppressCommand;
        await repo.Commands.updateSuppressCommand(guild.id, cmdModel.command, newSuppressSetting);
        CommandCache.ClearCache(guild.id);
        await commandExec.sendAsync(`Command ${cmdModel.command} will ${newSuppressSetting ? '' : 'not '}be deleted from channel on use.`);
        
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Command', commandName);
        commandLog?.addField('Suppress', newSuppressSetting ? 'true' : 'false');
        await commandExec.logAsync(commandLog);
    }
}

export class CommandLogCommand extends Command {
    public static readonly CommandName: string = 'command.log';
    
    constructor(){
        super({
            name: CommandLogCommand.CommandName,
            parentCommand: CommandCommand.CommandName,
            category: 'admin',
            usage: 'command <commandname> log',
            description: 'Enable or disables logging of command usage',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            examples: ['command mute log'],
            logByDefault: true,
            aliases: ['cmd']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (args.length !== 1) return;
        const guild = commandExec.guild;

        const commandName = args.shift();
        if (commandName === undefined) return;

        const repo = await RepositoryFactory.getInstanceAsync();
        const cmdModel = await repo.Commands.select(guild.id,commandName);
        if (cmdModel === undefined) return;

        const newLogSetting = !cmdModel.logUsage;
        await repo.Commands.updateLogUsage(guild.id, cmdModel.command, newLogSetting);
        CommandCache.ClearCache(guild.id);
        await commandExec.sendAsync(`Command ${cmdModel.command} logging ${newLogSetting ? 'enabled' : 'disabled'}.`);
        
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Command', commandName);
        commandLog?.addField('Logging', newLogSetting ? 'true' : 'false');
        await commandExec.logAsync(commandLog);
    }
}

export class CommandLogAttemptsCommand extends Command {
    public static readonly CommandName: string = 'command.logattempts';
    
    constructor(){
        super({
            name: CommandLogAttemptsCommand.CommandName,
            parentCommand: CommandCommand.CommandName,
            category: 'admin',
            usage: 'command <commandname> logattempts',
            description: 'Enable or disables logging of attempted command usage by members without permission',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            examples: ['command ban logattempts'],
            logByDefault: true,
            aliases: ['cmd']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (args.length !== 1) return;
        const guild = commandExec.guild;

        const commandName = args.shift();
        if (commandName === undefined) return;

        const repo = await RepositoryFactory.getInstanceAsync();
        const cmdModel = await repo.Commands.select(guild.id,commandName);
        if (cmdModel === undefined) return;

        const newLogSetting = !cmdModel.logAttempts;
        await repo.Commands.updateLogAttempts(guild.id, cmdModel.command, newLogSetting);
        CommandCache.ClearCache(guild.id);
        await commandExec.sendAsync(`Command ${cmdModel.command} attempt logging ${newLogSetting ? 'enabled' : 'disabled'}.`);
        
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Command', commandName);
        commandLog?.addField('Attempt Logging', newLogSetting ? 'true' : 'false');
        await commandExec.logAsync(commandLog);
    }
}

export class CommandOutputCommand extends Command {
    public static readonly CommandName: string = 'command.output';
    
    constructor(){
        super({
            name: CommandOutputCommand.CommandName,
            parentCommand: CommandCommand.CommandName,
            category: 'admin',
            usage: 'command <commandname> output <channel ID/mention>|clear',
            description: 'Sets or clears a channel where command output will be sent',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            examples: ['command ban output #staff-logs', 'command warn output clear'],
            logByDefault: true,
            aliases: ['cmd']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (args.length !== 2) return;
        const guild = commandExec.guild;

        const commandName = args.shift();
        if (commandName === undefined) return;

        const repo = await RepositoryFactory.getInstanceAsync();
        const cmdModel = await repo.Commands.select(guild.id,commandName);
        if (cmdModel === undefined) return;
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Command', commandName);

        const channelId = args.shift();
        if (channelId === undefined || channelId === null) {
            await commandExec.errorAsync('Unknown output argument.  Expected format: command <commandname> output clear|<channel ID/mention>');
            return;
        }
        if (channelId.toLowerCase() === 'clear') {
            await repo.Commands.updateOutputChannelId(guild.id, cmdModel.command, null);
            await commandExec.sendAsync(`Command ${cmdModel.command} output channel removed.`);
            commandLog?.addField('Output Redirection', 'cleared');
            await commandExec.logAsync(commandLog);
            return;
        }
        const newOutputChannel = CommandOutputCommand.tryGetChannel(guild, channelId);
        if (newOutputChannel === undefined) {
            await commandExec.errorAsync('Unknown output channel.  Expected format: command <commandname> output clear|<channel ID/mention>');
            return;
        }
        await repo.Commands.updateOutputChannelId(guild.id, cmdModel.command, newOutputChannel.id);
        CommandCache.ClearCache(guild.id);
        await commandExec.sendAsync(`Command ${cmdModel.command} output will be redirected to <#${newOutputChannel.id}>.`);

        commandLog?.addField('Output Redirection', newOutputChannel);
        await commandExec.logAsync(commandLog);
    }

    private static tryGetChannel = (guild: Guild, channelId: string|null) : TextChannel|undefined => {
        if (channelId === null) return;
        const cid = Command.extractChannelIDFromMention(channelId) || channelId;
        const channel = guild.channels.cache.get(cid);
        if (channel === undefined || !(channel instanceof TextChannel)) return;
        return channel;
    }
}

export class CommandAliasCommand extends Command {
    public static readonly CommandName: string = 'command.alias';
    
    constructor(){
        super({
            name: CommandAliasCommand.CommandName,
            parentCommand: CommandCommand.CommandName,
            category: 'admin',
            usage: 'command <commandname> alias +|- <alias>',
            description: 'Adds or removes a command alias',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            examples: ['command reactionrole alias + rr', 'command permissionset alias - pset'],
            logByDefault: true,
            aliases: ['cmd']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (args.length !== 2) return;
        const guild = commandExec.guild;

        const commandName = args.shift();
        if (commandName === undefined) return;

        const repo = await RepositoryFactory.getInstanceAsync();
        const cmdModel = await repo.Commands.select(guild.id,commandName);
        if (cmdModel === undefined) return;
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Command', commandName);

        const aliasOp = args.shift();
        if (aliasOp !== '+' && aliasOp !== '-') {
            await commandExec.errorAsync('Unknown alias argument.  Expected format: command <commandname> alias +|- <alias>');
            return;
        }
        const aliasName = args.shift();
        if (aliasName === undefined){
            await commandExec.errorAsync('Unknown alias argument.  Expected format: command <commandname> alias +|- <alias>');
            return;
        }
        const currentAliases = cmdModel.aliases;
        if (aliasOp === '+') {
            if (currentAliases.includes(aliasName)) {
                await commandExec.errorAsync(`Command ${cmdModel.command} already has alias ${aliasName}`);
                return;
            }
            currentAliases.push(aliasName);
            await repo.Commands.updateAliases(guild.id, cmdModel.command, currentAliases);
            CommandCache.ClearCache(guild.id);
            await commandExec.sendAsync(`Alias ${aliasName} added to command ${cmdModel.command}.`);
        }
        if (aliasOp === '-') {
            if (!currentAliases.includes(aliasName)) {
                await commandExec.errorAsync(`Command ${cmdModel.command} does not have alias ${aliasName}`);
                return;
            }
            const newAliases = currentAliases.filter(x => x !== aliasName);
            cmdModel.aliases = newAliases;
            await repo.Commands.updateAliases(guild.id, cmdModel.command, newAliases);
            CommandCache.ClearCache(guild.id);
            await commandExec.sendAsync(`Alias ${aliasName} removed from command ${cmdModel.command}.`);
        }

        commandLog?.addField('Aliases', cmdModel.aliases.push(' '));
        await commandExec.logAsync(commandLog);
    }
}

export class CommandPermissionSetCommand extends Command {
    public static readonly CommandName: string = 'command.pset';
    
    constructor(){
        super({
            name: CommandPermissionSetCommand.CommandName,
            parentCommand: CommandCommand.CommandName,
            category: 'admin',
            usage: 'command <commandname> pset <permission set ID>|clear',
            description: 'Sets or clears a permission set on a command',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'],
            examples: ['command warn pset 2', 'command ban pset clear'],
            logByDefault: true,
            aliases: ['cmd']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        if (args.length !== 2) return;
        const guild = commandExec.guild;

        const commandName = args.shift();
        if (commandName === undefined) return;

        const repo = await RepositoryFactory.getInstanceAsync();
        const cmdModel = await repo.Commands.select(guild.id,commandName);
        if (cmdModel === undefined) return;
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Command', commandName);

        const psetId = args.shift();
        if (psetId === undefined || psetId === null) {
            await commandExec.errorAsync('Unknown output argument.  Expected format: command <commandname> permissionset clear|<set ID>');
            return;
        }
        const reservedCommand = ReservedCommandList.find((c) => c.name == cmdModel.command);
        if (reservedCommand !== undefined && reservedCommand.adminOnly){
            await commandExec.errorAsync('Cannot apply permission sets to admin-only commands.');
            return;
        }
        if (psetId.toLowerCase() === 'clear') {
            await repo.Commands.updatePermissionSet(guild.id, cmdModel.command, null);
            await commandExec.sendAsync(`Command ${cmdModel.command} permission set removed.`);
            CommandCache.ClearCache(guild.id);
            commandLog?.addField('Permission Set', 'None');
            await commandExec.logAsync(commandLog);
            return;
        }
        const permissionset_id = parseInt(psetId);
        if (isNaN(permissionset_id)) {
            await commandExec.errorAsync('Invalid permission set ID');
            return;
        }
        const permissionSet = await repo.PermissionSets.select(guild.id, permissionset_id);
        if (permissionSet === undefined) {
            await commandExec.errorAsync('Invalid permission set ID');
            return;
        }
        await repo.Commands.updatePermissionSet(guild.id, cmdModel.command, permissionSet.set_id);
        CommandCache.ClearCache(guild.id);
        await commandExec.sendAsync(`Command ${cmdModel.command} adheres to permission set ${permissionSet.set_id} (${permissionSet.name}).`);

        commandLog?.addField('Permission Set', permissionSet.set_id);
        await commandExec.logAsync(commandLog);
    }
}

export const CommandCommands: Command[] = [
    new CommandCommand(),
    new CommandEnableCommand(),
    new CommandSuppressCommand(),
    new CommandLogCommand(),
    new CommandLogAttemptsCommand(),
    new CommandOutputCommand(),
    new CommandAliasCommand(),
    new CommandPermissionSetCommand()
];