import { Command } from '../Command';
import MooCommand from './moo';
import SetLogChannelCommand from "./setLogChannel";

const AdminCommands:Command[] = [
    new SetLogChannelCommand(),
    new MooCommand()
]

export default AdminCommands;