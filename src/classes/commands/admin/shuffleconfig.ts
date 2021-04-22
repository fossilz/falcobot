import { Message, MessageEmbed } from "discord.js";
import RepositoryFactory from "../../RepositoryFactory";
import Repository from "../../Repository";
import { Command } from "../Command";
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";
import ShuffleSettingsModel from "../../dataModels/ShuffleSettingsModel";

export class ShuffleConfigCommand extends Command {
    constructor(){
        super({
            name: 'shuffleconfig',
            category: 'admin',
            usage: 'shuffleconfig enable|disable|role|warnseconds|prepare|start|warn|randomize',
            description: 'Configures automatic Newegg Shuffle announcements',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS', 'MANAGE_ROLES'],
            examples: [
                'shuffleconfig',
                'shuffleconfig enable <channel ID/mention> [role ID/mention]',
                'shuffleconfig disable',
                'shuffleconfig role clear|<role ID/mention>',
                'shuffleconfig warnseconds 300',
                'shuffleconfig prepare Newegg Shuffle will start soon! Until it begins, the enter button is unavailable!',
                'shuffleconfig start Newegg Shuffle has begun! Get your selections in before it closes!',
                'shuffleconfig warn Newegg Shuffle is almost over! Get your selections in before it closes!',
                'shuffleconfig randomize'
            ],
            defaultUserPermissions: ['ADMINISTRATOR']
        });
    }

    run = async (_: Message, args: string[], commandExec: CommandExecutionParameters) : Promise<void> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const settings = await repo.Shuffles.selectSettings(commandExec.guild.id);
        const initialArg = args.shift();
        switch (initialArg) {
            case 'enable': return ShuffleConfigCommand.enable(args, commandExec, repo, settings);
            case 'disable': return ShuffleConfigCommand.disable(commandExec, repo, settings);
            case 'role': return ShuffleConfigCommand.role(args, commandExec, repo, settings);
            case 'warnseconds': return ShuffleConfigCommand.warnseconds(args, commandExec, repo, settings);
            case 'prepare': return ShuffleConfigCommand.prepare(args, commandExec, repo, settings);
            case 'start': return ShuffleConfigCommand.start(args, commandExec, repo, settings);
            case 'warn': return ShuffleConfigCommand.warn(args, commandExec, repo, settings);
            case 'randomize': return ShuffleConfigCommand.randomize(commandExec, repo, settings);
        }
        if (settings === undefined){
            await commandExec.sendAsync('Newegg Shuffle is currently not configured.  Use `shufflesettings enable <channel ID/mention> [role ID/mention]` to configure');
            return;
        }

        const announceChannel = commandExec.guild.channels.cache.get(settings.announce_channel_id);
        const pingRole = settings.ping_role_id === null ? undefined : commandExec.guild.roles.cache.get(settings.ping_role_id);

        const embed = new MessageEmbed()
            .setTitle(`Newegg Shuffle Configuration`)
            .setTimestamp()
            .setColor(commandExec.me.displayHexColor)
            .setFooter('`help shuffleconfig` for configuration options')
            .addField('Enabled', settings.enabled, true)
            .addField('Channel', announceChannel, true)
            .addField('Role', pingRole, true)
            .addField('Warning seconds', settings.warning_seconds, true)
            .addField('Randomize URL', settings.randomize_url ? "Randomized" : "Newegg Lottery ID", true)
            .addField('Prepare Message', settings.prepare_message)
            .addField('Start Message', settings.start_message)
            .addField('Warn Message', settings.warn_message);
        await commandExec.sendAsync(embed);
    }

    private static defaultSettings = (guild_id: string, enabled: boolean) : ShuffleSettingsModel => {
        const model = new ShuffleSettingsModel();
        model.guild_id = guild_id;
        model.enabled = enabled;
        model.announce_channel_id = "";
        model.warning_seconds = 300;
        model.prepare_message = "Newegg Shuffle will start soon! Until it begins, the enter button is unavailable!";
        model.start_message = "Newegg Shuffle has begun! Get your selections in before it closes!";
        model.warn_message = "Newegg Shuffle is almost over! Get your selections in before it closes!";
        model.randomize_url = true;
        return model;
    }

    private static enable = async (args: string[], commandExec: CommandExecutionParameters, repo: Repository, settings: ShuffleSettingsModel|undefined) : Promise<void> => {
        if (args.length < 1) {
            await commandExec.errorAsync('Improper syntax.  Use `shufflesettings enable <channel ID/mention> [role ID/mention]`');
            return;
        }
        const channelArg = args.shift();
        if (channelArg === undefined) {
            await commandExec.errorAsync('Improper syntax.  Use `shufflesettings enable <channel ID/mention> [role ID/mention]`');
            return;
        }
        const channel = Command.extractChannelMention(commandExec.guild,channelArg) || commandExec.guild.channels.cache.get(channelArg);
        if (channel === undefined) {
            await commandExec.errorAsync('Invalid channel provided for announcements.');
            return;
        }
        const roleArg = args.shift();
        const pingRole = roleArg === undefined ? null : Command.extractRoleMention(commandExec.guild, roleArg) || commandExec.guild.roles.cache.get(roleArg) || null;
        const newSettings = ShuffleConfigCommand.defaultSettings(commandExec.guild.id, true);
        newSettings.announce_channel_id = channel.id;
        newSettings.ping_role_id = pingRole?.id || null;
        if (settings === undefined) {
            await repo.Shuffles.insertSettings(newSettings);
            await commandExec.sendAsync(`Shuffle announcements enabled in ${channel}`);
            return;
        }
        if ((newSettings.enabled && true) !== (settings.enabled && true)) { // Cast truthy values from db to boolean comparison
            await repo.Shuffles.updateEnabled(commandExec.guild.id, true);
        }
        if (newSettings.announce_channel_id !== settings.announce_channel_id){
            await repo.Shuffles.updateAnnounceChannel(commandExec.guild.id, newSettings.announce_channel_id);
        }
        if (newSettings.ping_role_id != null && newSettings.ping_role_id !== settings.ping_role_id){
            await repo.Shuffles.updatePingRole(commandExec.guild.id, newSettings.ping_role_id);
        }
        await commandExec.sendAsync(`Shuffle announcements enabled in ${channel}`);
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Operation', 'enable', true);
        commandLog?.addField('Channel', channel, true);
        if (pingRole !== null)
            commandLog?.addField('Role', pingRole, true);
        await commandExec.logAsync(commandLog);
    }

    private static disable = async (commandExec: CommandExecutionParameters, repo: Repository, settings: ShuffleSettingsModel|undefined) : Promise<void> => {
        if (settings === undefined || !settings.enabled) {
            await commandExec.sendAsync(`Shuffle announcements are already disabled.`);
            return;
        }
        await repo.Shuffles.updateEnabled(commandExec.guild.id, false);
        await commandExec.sendAsync(`Shuffle announcements disabled.`);
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Operation', 'disable', true);
        await commandExec.logAsync(commandLog);
    }

    private static role = async (args: string[], commandExec: CommandExecutionParameters, repo: Repository, settings: ShuffleSettingsModel|undefined) : Promise<void> => {
        if (args.length < 1) {
            await commandExec.errorAsync('Improper syntax.  Use `shufflesettings role clear|<role ID/mention>`');
            return;
        }
        const roleArg = args.shift();
        if (roleArg === undefined){
            await commandExec.errorAsync('Improper syntax.  Use `shufflesettings role clear|<role ID/mention>`');
            return;
        }
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Operation', 'role', true);
        if (roleArg === "clear") {
            await repo.Shuffles.updatePingRole(commandExec.guild.id, null);
            await commandExec.sendAsync(`Shuffle announcements will not mention a role.`);
            commandLog?.addField('Role', 'Cleared', true);
            await commandExec.logAsync(commandLog);
            return;
        }
        const pingRole = Command.extractRoleMention(commandExec.guild, roleArg) || commandExec.guild.roles.cache.get(roleArg);
        if (pingRole === undefined) {
            await commandExec.errorAsync('Invalid role provided');
            return;
        }
        const newSettings = ShuffleConfigCommand.defaultSettings(commandExec.guild.id, false);
        newSettings.ping_role_id = pingRole.id;
        if (settings === undefined) {
            await repo.Shuffles.insertSettings(newSettings);
            await commandExec.sendAsync(`Shuffle announcements (currently disabled) will mention ${pingRole}`);
            commandLog?.addField('Role', pingRole, true);
            await commandExec.logAsync(commandLog);
            return;
        }
        if (newSettings.ping_role_id != null && newSettings.ping_role_id !== settings.ping_role_id){
            await repo.Shuffles.updatePingRole(commandExec.guild.id, newSettings.ping_role_id);
        }
        await commandExec.sendAsync(`Shuffle announcements will mention ${pingRole}`);
        commandLog?.addField('Role', pingRole, true);
        await commandExec.logAsync(commandLog);
    }

    private static warnseconds = async (args: string[], commandExec: CommandExecutionParameters, repo: Repository, settings: ShuffleSettingsModel|undefined) : Promise<void> => {
        if (args.length < 1) {
            await commandExec.errorAsync('Improper syntax.  Use `shufflesettings warnseconds [number]`');
            return;
        }

        const secondsArg = args.shift();
        if (secondsArg === undefined) {
            await commandExec.errorAsync('Improper syntax.  Use `shufflesettings warnseconds [number]`');
            return;
        }
        const warn_seconds = parseInt(secondsArg);
        if (isNaN(warn_seconds) === true || warn_seconds < 0 || warn_seconds > 1800) {
            await commandExec.errorAsync('Please specify number of seconds to warn before shuffle ends (max 1800, 0 to disable)');
            return;
        }
        const newSettings = ShuffleConfigCommand.defaultSettings(commandExec.guild.id, false);
        newSettings.warning_seconds = warn_seconds;
        
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Operation', 'warnseconds', true);
        commandLog?.addField('Warn Seconds', warn_seconds, true);
        if (settings === undefined) {
            await repo.Shuffles.insertSettings(newSettings);
            if (warn_seconds > 0) {
                await commandExec.sendAsync(`Shuffle announcements (currently disabled) will warn ${warn_seconds} before ending`);
            } else {
                await commandExec.sendAsync(`Shuffle announcements (currently disabled) will not send warnings.`);
            }
            await commandExec.logAsync(commandLog);
            return;
        }
        if (newSettings.warning_seconds !== settings.warning_seconds){
            await repo.Shuffles.updateWarningSeconds(commandExec.guild.id, newSettings.warning_seconds);
        }
        if (warn_seconds > 0) {
            await commandExec.sendAsync(`Shuffle announcements will warn ${warn_seconds} before ending`);
        } else {
            await commandExec.sendAsync(`Shuffle announcements will not send warnings.`);
        }
        await commandExec.logAsync(commandLog);
    }

    private static prepare = async (args: string[], commandExec: CommandExecutionParameters, repo: Repository, settings: ShuffleSettingsModel|undefined) : Promise<void> => {
        if (args.length < 1) {
            await commandExec.errorAsync('Improper syntax.  Use `shufflesettings prepare <message>`');
            return;
        }
        const prepare_message = args.join(' ');
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Operation', 'prepare', true);
        commandLog?.addField('Prepare Message', prepare_message, true);
        const newSettings = ShuffleConfigCommand.defaultSettings(commandExec.guild.id, false);
        newSettings.prepare_message = prepare_message;
        if (settings === undefined) {
            await repo.Shuffles.insertSettings(newSettings);
        } else {
            await repo.Shuffles.updatePrepareMessage(commandExec.guild.id, prepare_message);
        }
        await commandExec.sendAsync(`Prepare message set.`);
        await commandExec.logAsync(commandLog);
    }

    private static start = async (args: string[], commandExec: CommandExecutionParameters, repo: Repository, settings: ShuffleSettingsModel|undefined) : Promise<void> => {
        if (args.length < 1) {
            await commandExec.errorAsync('Improper syntax.  Use `shufflesettings start <message>`');
            return;
        }
        const start_message = args.join(' ');
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Operation', 'start', true);
        commandLog?.addField('Prepare Message', start_message, true);
        const newSettings = ShuffleConfigCommand.defaultSettings(commandExec.guild.id, false);
        newSettings.start_message = start_message;
        if (settings === undefined) {
            await repo.Shuffles.insertSettings(newSettings);
        } else {
            await repo.Shuffles.updateStartMessage(commandExec.guild.id, start_message);
        }
        await commandExec.sendAsync(`Start message set.`);
        await commandExec.logAsync(commandLog);
    }

    private static warn = async (args: string[], commandExec: CommandExecutionParameters, repo: Repository, settings: ShuffleSettingsModel|undefined) : Promise<void> => {
        if (args.length < 1) {
            await commandExec.errorAsync('Improper syntax.  Use `shufflesettings warn <message>`');
            return;
        }
        const warn_message = args.join(' ');
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Operation', 'warn', true);
        commandLog?.addField('Prepare Message', warn_message, true);
        const newSettings = ShuffleConfigCommand.defaultSettings(commandExec.guild.id, false);
        newSettings.warn_message = warn_message;
        if (settings === undefined) {
            await repo.Shuffles.insertSettings(newSettings);
        } else {
            await repo.Shuffles.updateWarnMessage(commandExec.guild.id, warn_message);
        }
        await commandExec.sendAsync(`Warn message set.`);
        await commandExec.logAsync(commandLog);
    }

    private static randomize = async (commandExec: CommandExecutionParameters, repo: Repository, settings: ShuffleSettingsModel|undefined) : Promise<void> => {
        if (settings === undefined) {
            await commandExec.sendAsync(`Shuffle announcements are currently disabled.`);
            return;
        }
        var newValue = !(settings.randomize_url);
        
        const commandLog = commandExec.getCommandLog();
        commandLog?.addField('Operation', 'randomize', true);
        commandLog?.addField('Randomize URL', newValue ? "Randomized" : "Newegg Lottery ID", true);
        await repo.Shuffles.updateRandomize(commandExec.guild.id, newValue);
        if (newValue){
            await commandExec.sendAsync(`Newegg Shuffle URLs will be randomized.`);
        } else {
            await commandExec.sendAsync(`Newegg Shuffle URLs will show shuffle ID.`);
        }
        await commandExec.logAsync(commandLog);
    }
}