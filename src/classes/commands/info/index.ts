import { Command } from '../Command';
import AvatarCommand from "./avatar";
import PingCommand from "./ping";
import MembersCommand from './members';
import RoleInfoCommand from './roleinfo';
import HelpCommand from './help';
import WhoisCommand from './whois';
import { ShuffleCommands } from './shuffle';

const InfoCommands:Command[] = [
    new AvatarCommand(),
    new PingCommand(),
    new MembersCommand(),
    new RoleInfoCommand(),
    new HelpCommand(),
    new WhoisCommand()
].concat(ShuffleCommands);

export default InfoCommands;