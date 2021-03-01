import { Guild, GuildMember, Message, MessageEmbed } from "discord.js";
import { CommandHandler } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import CommandModel from "src/classes/dataModels/CommandModel";
import ReservedCommandList from '../';

class HelpCommand extends Command {
    constructor(){
        super({
            name: 'help',
            category: 'info',
            usage: 'help [commandname]',
            description: 'Get command information',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['help', 'help purge'],
            logByDefault: false
        });
    }

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;

        const repo = await RepositoryFactory.getInstanceAsync();
        const commands = await repo.Commands.selectAll(message.guild.id);

        let commandName: string | undefined = undefined;
        if (args.length > 0) {
            commandName = args.shift();
        }

        const commandHelpers = await this.getCommandHelpers(commandName, commands, guild, message.member);
        const embed = new MessageEmbed()
            .setTimestamp()
            .setColor(message.guild.me.displayHexColor);
        if (commandHelpers.length === 1 && commandHelpers[0].category === undefined && commandHelpers[0].commands.length === 1) {
            const command = commandHelpers[0].commands[0];
            const rCommand = ReservedCommandList.find(rc => rc.name == command.command);
            if (rCommand != undefined){
                embed
                    .setTitle(rCommand.name)
                    .setDescription(rCommand.description);
                embed.addField('Category', rCommand.category, true);
                embed.addField('Enabled', command.enabled ? 'Yes' : 'No', true);
                embed.addField('Usage', rCommand.usage);
                if( rCommand.examples.length > 0) {
                    embed.addField('Examples', rCommand.examples.join('\n'));
                }
            } else {
                // Custom command
                embed.setTitle(command.command);
                embed.setDescription("This is a custom command");
                embed.addField('Enabled', command.enabled ? 'Yes' : 'No', true);
            }
        } else {
            embed
                .setTitle("Falcobot Commands")
                .setFooter("See `help [commandName]` for more details");
            commandHelpers.forEach(ch => {
                embed.addField(ch.category,ch.commands.map(c=>c.command).join(' '));
            });
        }

        message.channel.send(embed);
        return;

        await StaffLog.FromCommand(this, message)?.send();
    }

    private getCommandHelpers = async (commandName: string|undefined, commands: CommandModel[], guild: Guild, member: GuildMember|null) : Promise<CommandCategory[]> => {
        const specificCommand = await this.getAllowedCommand(commands.find((c) => c.command === commandName), guild, member);
        if (specificCommand != undefined) {
            const returnCat = new CommandCategory();
            returnCat.commands.push(specificCommand);
            return [returnCat];
        }
        const categories = Array.from(new Set(ReservedCommandList.map(cs => cs.category)));
        const resultSet: CommandCategory[] = [];
        await asyncForEach(categories, async (category) => {
            const rcommands = ReservedCommandList.filter(x => x.category == category);
            const ccat = new CommandCategory();
            ccat.category = category;
            await asyncForEach(rcommands, async (command) => {
                const cModel = commands.find(c => c.command == command.name);
                if (cModel === undefined) return;
                const allowedCommand = await this.getAllowedCommand(cModel, guild, member);
                if (allowedCommand === undefined) return;
                ccat.commands.push(allowedCommand);
            });
            if (ccat.commands.length > 0) {
                resultSet.push(ccat);
            }
        });
        const customCommands = commands.filter(x => !x.reserved);
        if (customCommands.length > 0){
            const customCategory = new CommandCategory();
            customCategory.category = 'Custom';
            await asyncForEach(customCommands, async (command) => {
                const allowedCommand = await this.getAllowedCommand(command, guild, member);
                if (allowedCommand === undefined) return;
                customCategory.commands.push(allowedCommand);
            });
            if (customCategory.commands.length > 0) {
                resultSet.push(customCategory);
            }
        }
        return resultSet;
    }

    private getAllowedCommand = async (command: CommandModel | undefined, guild: Guild, member: GuildMember|null) : Promise<CommandModel|undefined> => {
        if (command === undefined) return;
        var pModel = await CommandHandler.GetCommandExecutionPermissions(guild, command.command, member, undefined, true);
        if (!pModel.canExecute) return;
        if (pModel.command === null) return;
        return pModel.command;
    }
}

async function asyncForEach<T>(array: Array<T>, callback: (arg: T, index?: number, array?: Array<T>) => Promise<void>) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}

class CommandCategory {
    category: string;
    commands: CommandModel[] = [];
}

export default HelpCommand;