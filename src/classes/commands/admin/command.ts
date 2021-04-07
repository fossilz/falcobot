import { Guild, GuildMember, Message, MessageEmbed, TextChannel } from "discord.js";
import { CommandHandler, CommandExecutionParameters } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import { Command } from "../Command";
import CommandModel from "../../dataModels/CommandModel";
import ReservedCommandList from '../';

class CommandCommand extends Command {
    constructor(){
        super({
            name: 'command',
            category: 'info',
            usage: 'command <commandname> [enable|disable|log|logattempts|output|alias|permissionset]',
            description: 'Get command information',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['ADMINISTRATOR'], // This command /defaults/ to Admin, but it can be useful for others, so it does not carry adminOnly
            examples: ['command', 'command purge', 'command superping disable'],
            logByDefault: false,
            aliases: ['cmd']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
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

        if (args.length === 0){
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
            if (cmdModel.aliases.length > 0){
                embed.addField('Aliases', cmdModel.aliases.join(', '), true);
            }
            if (cmdModel.permissionset_id !== null) {
                const pset = await repo.PermissionSets.select(guild.id, cmdModel.permissionset_id);
                if (pset !== undefined){
                    embed.addField('Permission Set', `${pset.set_id} (${pset.name})`, true);
                }
            }
            const outputChannel = CommandCommand.tryGetChannel(guild, cmdModel.outputChannelId);
            if (outputChannel !== undefined){
                embed.addField('Output redirected to', outputChannel);
            }

            await commandExec.sendAsync(embed);
            return;
        }

        const settingArg = args.shift();
        if (settingArg === undefined) {
            await commandExec.errorAsync('Unknown command argument.  Allowed arguments: enable, disable, suppress, log, logattempts, output clear|<channel ID/mention>, alias +|- <alias>, permissionset clear|<set ID>');
            return;
        }

        switch(settingArg) {
            case 'enable':
                await repo.Commands.updateEnabled(guild.id, cmdModel.command, true);
                CommandHandler.ClearCommandCache(guild.id);
                await commandExec.sendAsync(`Command ${cmdModel.command} enabled.`);
                break;
            case 'disable':
                await repo.Commands.updateEnabled(guild.id, cmdModel.command, false);
                CommandHandler.ClearCommandCache(guild.id);
                await commandExec.sendAsync(`Command ${cmdModel.command} disabled.`);
                break;
            case 'suppress':
                const newSuppressSetting = !cmdModel.suppressCommand;
                await repo.Commands.updateSuppressCommand(guild.id, cmdModel.command, newSuppressSetting);
                CommandHandler.ClearCommandCache(guild.id);
                await commandExec.sendAsync(`Command ${cmdModel.command} will ${newSuppressSetting ? '' : 'not '}be deleted from channel on use.`);
                break;
            case 'log':
                const newLogSetting = !cmdModel.logUsage;
                await repo.Commands.updateLogUsage(guild.id, cmdModel.command, newLogSetting);
                CommandHandler.ClearCommandCache(guild.id);
                await commandExec.sendAsync(`Command ${cmdModel.command} logging ${newLogSetting ? 'enabled' : 'disabled'}.`);
                break;
            case 'logattempts':
                const newLogASetting = !cmdModel.logUsage;
                await repo.Commands.updateLogAttempts(guild.id, cmdModel.command, newLogASetting);
                CommandHandler.ClearCommandCache(guild.id);
                await commandExec.sendAsync(`Command ${cmdModel.command} attempt logging ${newLogASetting ? 'enabled' : 'disabled'}.`);
                break;
            case 'output':
                const channelId = args.shift();
                if (channelId === undefined || channelId === null) {
                    await commandExec.errorAsync('Unknown output argument.  Expected format: command <commandname> output clear|<channel ID/mention>');
                    break;
                }
                if (channelId.toLowerCase() === 'clear') {
                    await repo.Commands.updateOutputChannelId(guild.id, cmdModel.command, null);
                    await commandExec.sendAsync(`Command ${cmdModel.command} output channel removed.`);
                    break;
                }
                const newOutputChannel = CommandCommand.tryGetChannel(guild, channelId);
                if (newOutputChannel === undefined) {
                    await commandExec.errorAsync('Unknown output channel.  Expected format: command <commandname> output clear|<channel ID/mention>');
                    break;
                }
                await repo.Commands.updateOutputChannelId(guild.id, cmdModel.command, newOutputChannel.id);
                CommandHandler.ClearCommandCache(guild.id);
                await commandExec.sendAsync(`Command ${cmdModel.command} output will be redirected to <#${newOutputChannel.id}>.`);
                break;
            case 'alias':
                const aliasOp = args.shift();
                if (aliasOp !== '+' && aliasOp !== '-') {
                    await commandExec.errorAsync('Unknown alias argument.  Expected format: command <commandname> alias +|- <alias>');
                    break;
                }
                const aliasName = args.shift();
                if (aliasName === undefined){
                    await commandExec.errorAsync('Unknown alias argument.  Expected format: command <commandname> alias +|- <alias>');
                    break;
                }
                const currentAliases = cmdModel.aliases;
                if (aliasOp === '+') {
                    if (currentAliases.includes(aliasName)) {
                        await commandExec.errorAsync(`Command ${cmdModel.command} already has alias ${aliasName}`);
                        break;
                    }
                    currentAliases.push(aliasName);
                    await repo.Commands.updateAliases(guild.id, cmdModel.command, currentAliases);
                    CommandHandler.ClearCommandCache(guild.id);
                    await commandExec.sendAsync(`Alias ${aliasName} added to command ${cmdModel.command}.`);
                    break;
                }
                if (aliasOp === '-') {
                    if (!currentAliases.includes(aliasName)) {
                        await commandExec.errorAsync(`Command ${cmdModel.command} does not have alias ${aliasName}`);
                        break;
                    }
                    const newAliases = currentAliases.filter(x => x !== aliasName);
                    cmdModel.aliases = newAliases;
                    await repo.Commands.updateAliases(guild.id, cmdModel.command, newAliases);
                    CommandHandler.ClearCommandCache(guild.id);
                    await commandExec.sendAsync(`Alias ${aliasName} removed from command ${cmdModel.command}.`);
                    break;
                }
                break;
            case 'permissionset':
                const psetId = args.shift();
                if (psetId === undefined || psetId === null) {
                    await commandExec.errorAsync('Unknown output argument.  Expected format: command <commandname> permissionset clear|<set ID>');
                    break;
                }
                const reservedCommand = ReservedCommandList.find((c) => c.name == cmdModel.command);
                if (reservedCommand !== undefined && reservedCommand.adminOnly){
                    await commandExec.errorAsync('Cannot apply permission sets to admin-only commands.');
                    break;
                }
                if (psetId.toLowerCase() === 'clear') {
                    await repo.Commands.updatePermissionSet(guild.id, cmdModel.command, null);
                    await commandExec.sendAsync(`Command ${cmdModel.command} permission set removed.`);
                    break;
                }
                const permissionset_id = parseInt(psetId);
                if (isNaN(permissionset_id)) {
                    await commandExec.errorAsync('Invalid permission set ID');
                    break;
                }
                const permissionSet = await repo.PermissionSets.select(guild.id, permissionset_id);
                if (permissionSet === undefined) {
                    await commandExec.errorAsync('Invalid permission set ID');
                    break;
                }
                await repo.Commands.updatePermissionSet(guild.id, cmdModel.command, permissionSet.set_id);
                CommandHandler.ClearCommandCache(guild.id);
                await commandExec.sendAsync(`Command ${cmdModel.command} adheres to permission set ${permissionSet.set_id} (${permissionSet.name}).`);
                break;
        }

        await commandExec.logDefaultAsync();
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
        var pModel = await CommandHandler.GetCommandExecutionPermissions(guild, command.command, member, undefined, true);
        if (!pModel.canExecute) return;
        if (pModel.command === null) return;
        return pModel.command;
    }
}

export default CommandCommand;