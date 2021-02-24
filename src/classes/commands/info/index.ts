import { Command } from '../Command';
import AvatarCommand from "./avatar";
import PingCommand from "./ping";

const InfoCommands:Command[] = [
    new AvatarCommand(),
    new PingCommand()
]

export default InfoCommands;