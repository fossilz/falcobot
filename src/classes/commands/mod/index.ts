import { Command } from '../Command';
import MuteCommand from './mute';
import PurgeCommand from './purge';
import SuperPingCommand from './superPing';

const ModCommands:Command[] = [
    new MuteCommand(),
    new PurgeCommand(),
    new SuperPingCommand()
]

export default ModCommands;