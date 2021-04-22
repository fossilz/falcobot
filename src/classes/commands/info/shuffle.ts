import moment from "moment";
import "moment-timezone";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import { Message, MessageEmbed } from "discord.js";
import RepositoryFactory from "../../RepositoryFactory";
import { NewEggShuffleHandler } from "../../behaviors/NewEggShuffleHandler";

export class ShuffleCommand extends Command {
    public static readonly CommandName: string = 'shuffle';

    constructor(){
        super({
            name: ShuffleCommand.CommandName,
            childCommands: [
                ShuffleStatusCommand.CommandName/*,
                ShuffleHistoryCommand.CommandName*/
            ],
            category: 'info',
            usage: 'shuffle',
            description: 'Get shuffle status',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['shuffle'/*,'shuffle history'*/]
        });
    }

    run = async (message: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const firstArg = args.shift();
        if (firstArg?.toLowerCase() === 'history') {
            await this.runChildCommandAsync(ShuffleHistoryCommand.CommandName, message, args, commandExec);
            return;
        }
        await this.runChildCommandAsync(ShuffleStatusCommand.CommandName, message, args, commandExec);
        return;
    }
}

export class ShuffleStatusCommand extends Command {
    public static readonly CommandName: string = 'shuffle status';

    constructor(){
        super({
            name: ShuffleStatusCommand.CommandName,
            parentCommand: ShuffleCommand.CommandName,
            category: 'info',
            usage: 'shuffle status',
            description: 'Get shuffle status',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['shuffle','shuffle status']
        });
    }

    run = async (_: Message, __: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const lastShuffles = await repo.Shuffles.selectHistory(1, 0);
        const lastShuffle = lastShuffles.shift();
        if (lastShuffle === undefined) {
            await commandExec.sendAsync("Currently no Newegg Shuffle information available.");
            return;
        }
        const now = moment().utc();
        const lStart = moment.utc(lastShuffle.lotteryStartDate);
        const lEnd = moment.utc(lastShuffle.lotteryEndDate);
        const draw = moment.utc(lastShuffle.lotteryDrawDate);
        const sellEnd = moment.utc(lastShuffle.sellingEndDate);
        if (sellEnd < now) {
            await commandExec.sendAsync(`There is not currently a shuffle running.  The last shuffle ended ${lEnd.tz('America/Los_Angeles').calendar()} Pacific Time.`);
            return;
        }
        const shuffleUrl = await NewEggShuffleHandler.getShuffleUrl(repo, commandExec.guild.id, lastShuffle.lotteryId);
        const shuffleEmbed = new MessageEmbed()
            .setColor('#f78c1b')
            .setTitle('Newegg Shuffle')
            .setURL(shuffleUrl)
            .setDescription(this.getCurrentStatus(now,lStart,lEnd,draw) + `\n\n${shuffleUrl}\n\n(All times are in ${lStart.tz('America/Los_Angeles').format("z")})`)
            .setTimestamp()
            .setFooter('See `help shuffle` for more information');
        shuffleEmbed.addField('Lottery Start', lStart.tz('America/Los_Angeles').format("h:mm:ss a"), true);
        shuffleEmbed.addField('Lottery End', lEnd.tz('America/Los_Angeles').format("h:mm:ss a"), true);
        shuffleEmbed.addField('Draw Time', draw.tz('America/Los_Angeles').format("h:mm:ss a"), true);
        const lotteryDescription = NewEggShuffleHandler.getLotteryDescription(lastShuffle);
        if (lotteryDescription !== undefined) {
            shuffleEmbed.addField('Shuffle items', lotteryDescription);
        }
        await commandExec.sendAsync(shuffleEmbed);
    }

    getCurrentStatus = (now: moment.Moment, lStart: moment.Moment, lEnd: moment.Moment, draw: moment.Moment) : string => {
        if (now > draw) {
            return "This shuffle is over.  Please check your email for win/lose notifications.";
        }
        if (now > lEnd) {
            return `The shuffle signup has ended.  Drawing is expected ${draw.tz('America/Los_Angeles').calendar()}.`;
        }
        if (now > lStart) {
            return `The shuffle is currently live.  Entries are expected to close ${lEnd.tz('America/Los_Angeles').calendar()}.`;
        }
        return `The shuffle has not yet started.  Entries are expected to open ${lStart.tz('America/Los_Angeles').calendar()}.`;
    }
}

export class ShuffleHistoryCommand extends Command {
    public static readonly CommandName: string = 'shuffle history';

    constructor(){
        super({
            name: ShuffleHistoryCommand.CommandName,
            parentCommand: ShuffleCommand.CommandName,
            category: 'info',
            usage: 'shuffle history',
            description: 'Get past shuffles',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            examples: ['shuffle history']
        });
    }

    run = async (message: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        console.log(message,args,commandExec);
        // Intent - allow a command to see past Shuffle history.
        await commandExec.sendAsync("This command is not yet implemented.");
    }
}

export const ShuffleCommands = [
    new ShuffleCommand(),
    new ShuffleStatusCommand()/*,
    new ShuffleHistoryCommand()*/
];