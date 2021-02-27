import { Command } from '../Command';
import AvatarCommand from "./avatar";
import PingCommand from "./ping";
import CommandCommand from './command';
import MembersCommand from './members';
import RoleInfoCommand from './roleinfo';

const InfoCommands:Command[] = [
    new AvatarCommand(),
    new PingCommand(),
    new CommandCommand(),
    new MembersCommand(),
    new RoleInfoCommand()
]

export default InfoCommands;