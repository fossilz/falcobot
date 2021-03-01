import { Guild, GuildMember, Message, MessageEmbed } from "discord.js";
import { CommandHandler } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import CommandModel from "src/classes/dataModels/CommandModel";
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

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;

        const repo = await RepositoryFactory.getInstanceAsync();
        const commands = await repo.Commands.selectAll(message.guild.id);

        if (args.length === 0) {
            // Error message?
            return;
        }

        const commandName = args.shift();
        if (commandName === undefined || commandName === '') {
            // Error message?
            return;
        }

        const cmdModel = await this.getAllowedCommand(commands.find(x=>x.command == commandName), guild, message.member);
        if (cmdModel === undefined){
            // Error message : bad command or inaccessible
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

            message.channel.send(embed);
            return;
        }

        const settingArg = args.shift();
        if (settingArg === undefined) {
            return;
        }

        switch(settingArg) {
            case 'enable':
                await repo.Commands.updateEnabled(guild.id, cmdModel.command, true);
                message.channel.send(`Command ${cmdModel.command} enabled.`);
                break;
            case 'disable':
                await repo.Commands.updateEnabled(guild.id, cmdModel.command, false);
                message.channel.send(`Command ${cmdModel.command} disabled.`);
                break;
            case 'log':
                const newLogSetting = !cmdModel.logUsage;
                await repo.Commands.updateLogUsage(guild.id, cmdModel.command, newLogSetting);
                message.channel.send(`Command ${cmdModel.command} logging ${newLogSetting ? 'enabled' : 'disabled'}.`);
                break;
            case 'logattempts':
                const newLogASetting = !cmdModel.logUsage;
                await repo.Commands.updateLogAttempts(guild.id, cmdModel.command, newLogASetting);
                message.channel.send(`Command ${cmdModel.command} attempt logging ${newLogASetting ? 'enabled' : 'disabled'}.`);
                break;
        }

        await StaffLog.FromCommand(this, message)?.send();
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