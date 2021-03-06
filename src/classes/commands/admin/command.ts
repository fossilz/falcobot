import { Guild, GuildMember, Message, MessageEmbed, TextChannel } from "discord.js";
import { CommandHandler, CommandExecutionParameters } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import CommandModel from "../../dataModels/CommandModel";
import ReservedCommandList from '../';

class CommandCommand extends Command {
    constructor(){
        super({
            name: 'command',
            category: 'info',
            usage: 'command [commandname] [enable|disable|log|logattempts]',
            description: 'Get command information',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['command', 'command purge', 'command superping disable'],
            logByDefault: false
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;

        const repo = await RepositoryFactory.getInstanceAsync();
        const commands = await repo.Commands.selectAll(message.guild.id);

        if (args.length === 0) {
            this.error('Please specify a command.', executionParameters);
            return;
        }

        const commandName = args.shift();
        if (commandName === undefined || commandName === '') {
            this.error('Please specify a command.', executionParameters);
            return;
        }

        const cmdModel = await this.getAllowedCommand(commands.find(x=>x.command == commandName), guild, message.member);
        if (cmdModel === undefined){
            this.error('Unknown command.', executionParameters);
            return;
        }

        if (args.length === 0){
            const embed = new MessageEmbed()
                .setTimestamp()
                .setColor(message.guild.me.displayHexColor);
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
            const outputChannel = this.tryGetChannel(guild, cmdModel.outputChannelId);
            if (outputChannel !== undefined){
                embed.addField('Output redirected to', outputChannel);
            }

            this.send(embed, executionParameters);
            return;
        }

        const settingArg = args.shift();
        if (settingArg === undefined) {
            this.error('Unknown command argument.  Allowed arguments: enable, disable, suppress, log, logattempts, output clear|<channel ID/mention>', executionParameters);
            return;
        }

        switch(settingArg) {
            case 'enable':
                await repo.Commands.updateEnabled(guild.id, cmdModel.command, true);
                this.send(`Command ${cmdModel.command} enabled.`, executionParameters);
                break;
            case 'disable':
                await repo.Commands.updateEnabled(guild.id, cmdModel.command, false);
                this.send(`Command ${cmdModel.command} disabled.`, executionParameters);
                break;
            case 'suppress':
                const newSuppressSetting = !cmdModel.suppressCommand;
                await repo.Commands.updateSuppressCommand(guild.id, cmdModel.command, newSuppressSetting);
                this.send(`Command ${cmdModel.command} will ${newSuppressSetting ? '' : 'not '}be deleted from channel on use.`, executionParameters);
                break;
            case 'log':
                const newLogSetting = !cmdModel.logUsage;
                await repo.Commands.updateLogUsage(guild.id, cmdModel.command, newLogSetting);
                this.send(`Command ${cmdModel.command} logging ${newLogSetting ? 'enabled' : 'disabled'}.`, executionParameters);
                break;
            case 'logattempts':
                const newLogASetting = !cmdModel.logUsage;
                await repo.Commands.updateLogAttempts(guild.id, cmdModel.command, newLogASetting);
                this.send(`Command ${cmdModel.command} attempt logging ${newLogASetting ? 'enabled' : 'disabled'}.`, executionParameters);
                break;
            case 'output':
                const channelId = args.shift();
                if (channelId === undefined || channelId === null) {
                    this.error('Unknown output argument.  Expected format: command <commandname> output clear|<channel ID/mention>', executionParameters);
                    break;
                }
                if (channelId.toLowerCase() === 'clear') {
                    await repo.Commands.updateOutputChannelId(guild.id, cmdModel.command, null);
                    this.send(`Command ${cmdModel.command} output channel removed.`, executionParameters);
                    break;
                }
                const newOutputChannel = this.tryGetChannel(guild, channelId);
                if (newOutputChannel === undefined) {
                    this.error('Unknown output channel.  Expected format: command <commandname> output clear|<channel ID/mention>', executionParameters);
                    break;
                }
                await repo.Commands.updateOutputChannelId(guild.id, cmdModel.command, newOutputChannel.id);
                this.send(`Command ${cmdModel.command} output will be redirected to <#${newOutputChannel.id}>.`, executionParameters);
                break;
        }

        await StaffLog.FromCommand(this, message, executionParameters)?.send();
    }

    private tryGetChannel = (guild: Guild, channelId: string|null) : TextChannel|undefined => {
        if (channelId === null) return;
        const cid = this.extractChannelIDFromMention(channelId) || channelId;
        const channel = guild.channels.cache.get(cid);
        if (channel === undefined || !(channel instanceof TextChannel)) return;
        return channel;
    }

    private getAllowedCommand = async (command: CommandModel | undefined, guild: Guild, member: GuildMember|null) : Promise<CommandModel|undefined> => {
        if (command === undefined) return;
        var pModel = await CommandHandler.GetCommandExecutionPermissions(guild, command.command, member, undefined, true);
        if (!pModel.canExecute) return;
        if (pModel.command === null) return;
        return pModel.command;
    }
}

export default CommandCommand;