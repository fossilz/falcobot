import { Command } from '../Command';
import BanCommand from './ban';
import KickCommand from './kick';
import MuteCommand from './mute';
import NoteCommand from './note';
import PurgeCommand from './purge';
import SuperPingCommand from './superPing';
import WarnCommand from './warn';

const ModCommands:Command[] = [
    new MuteCommand(),
    new PurgeCommand(),
    new SuperPingCommand(),
    new BanCommand(),
    new KickCommand(),
    new WarnCommand(),
    new NoteCommand()
]

export default ModCommands;