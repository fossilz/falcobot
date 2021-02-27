import { Command } from '../Command';
import BanCommand from './ban';
import KickCommand from './kick';
import MuteCommand from './mute';
import PurgeCommand from './purge';
import SuperPingCommand from './superPing';

const ModCommands:Command[] = [
    new MuteCommand(),
    new PurgeCommand(),
    new SuperPingCommand(),
    new BanCommand(),
    new KickCommand()
]

export default ModCommands;