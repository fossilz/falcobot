import { Guild, GuildMember, Message, MessageEmbed } from "discord.js";
import { CommandExecutionParameters, CommandHandler } from "../../behaviors/CommandHandler";
import RepositoryFactory from "../../RepositoryFactory";
import { Command } from "../Command";
import CommandModel from "../../dataModels/CommandModel";
import ReservedCommandList from '../';
import { asyncForEach } from "../../utils/functions";

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

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const guild = commandExec.guild;

        const repo = await RepositoryFactory.getInstanceAsync();
        const commands = await repo.Commands.selectAll(guild.id);

        let commandName: string | undefined = undefined;
        if (args.length > 0) {
            commandName = args.shift();
        }

        const commandHelpers = await HelpCommand.getCommandHelpers(commandName, commands, guild, commandExec.messageMember);
        const embed = new MessageEmbed()
            .setTimestamp()
            .setColor(commandExec.me.displayHexColor);
        if (commandHelpers.length === 1 && commandHelpers[0].category === undefined && commandHelpers[0].commands.length === 1) {
            const command = commandHelpers[0].commands[0];
            const rCommand = ReservedCommandList.find(rc => rc.name == command.command);
            if (rCommand != undefined){
                embed
                    .setTitle(rCommand.name)
                    .setDescription(rCommand.description);
                embed.addField('Category', rCommand.category, true);
                embed.addField('Enabled', command.enabled ? 'Yes' : 'No', true);
                if (command.aliases.length > 0){
                    embed.addField('Aliases', command.aliases.join(', '), true);
                }
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

        await commandExec.sendAsync(embed);
    }

    private static getCommandHelpers = async (commandName: string|undefined, commands: CommandModel[], guild: Guild, member: GuildMember|null) : Promise<CommandCategory[]> => {
        const specificCommand = await HelpCommand.getAllowedCommand(commands.find((c) => c.command === commandName), guild, member);
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
                const allowedCommand = await HelpCommand.getAllowedCommand(cModel, guild, member);
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
                const allowedCommand = await HelpCommand.getAllowedCommand(command, guild, member);
                if (allowedCommand === undefined) return;
                customCategory.commands.push(allowedCommand);
            });
            if (customCategory.commands.length > 0) {
                resultSet.push(customCategory);
            }
        }
        return resultSet;
    }

    private static getAllowedCommand = async (command: CommandModel | undefined, guild: Guild, member: GuildMember|null) : Promise<CommandModel|undefined> => {
        if (command === undefined) return;
        var pModel = await CommandHandler.GetCommandExecutionPermissions(guild, command.command, member, undefined, true);
        if (!pModel.canExecute) return;
        if (pModel.command === null) return;
        return pModel.command;
    }
}

class CommandCategory {
    category: string;
    commands: CommandModel[] = [];
}

export default HelpCommand;