import { Command } from '../Command';
import CommandCommand from './command';
import MooCommand from './moo';
import SetChannelAutoRoleCommand from './setChannelAutoRole';
import SetLogChannelCommand from "./setLogChannel";

const AdminCommands:Command[] = [
    new SetLogChannelCommand(),
    new MooCommand(),
    new SetChannelAutoRoleCommand(),
    new CommandCommand()
]

export default AdminCommands;