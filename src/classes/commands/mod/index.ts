import { Command } from '../Command';
import BanCommand from './ban';
import KickCommand from './kick';
import MuteCommand from './mute';
import NoteCommand from './note';
import PurgeCommand from './purge';
import SlowmodeCommand from './slowmode';
import SuperPingCommand from './superPing';
import UnbanCommand from './unban';
import UnmuteCommand from './unmute';
import WarnCommand from './warn';

const ModCommands:Command[] = [
    new MuteCommand(),
    new PurgeCommand(),
    new SuperPingCommand(),
    new BanCommand(),
    new KickCommand(),
    new WarnCommand(),
    new NoteCommand(),
    new UnmuteCommand(),
    new UnbanCommand(),
    new SlowmodeCommand()
]

export default ModCommands;