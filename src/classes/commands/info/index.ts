import { Command } from '../Command';
import AvatarCommand from "./avatar";
import PingCommand from "./ping";
import CommandCommand from './command';
import MembersCommand from './members';

const InfoCommands:Command[] = [
    new AvatarCommand(),
    new PingCommand(),
    new CommandCommand(),
    new MembersCommand()
]

export default InfoCommands;