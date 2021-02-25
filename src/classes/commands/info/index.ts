import { Command } from '../Command';
import AvatarCommand from "./avatar";
import PingCommand from "./ping";
import CommandCommand from './command';

const InfoCommands:Command[] = [
    new AvatarCommand(),
    new PingCommand(),
    new CommandCommand()
]

export default InfoCommands;