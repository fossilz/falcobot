import { Command } from '../Command';
import CommandCommand from './command';
import MooCommand from './moo';
import ReactionRoleCommand from './reactionRole';
import SetChannelAutoRoleCommand from './setChannelAutoRole';
import SetLogChannelCommand from "./setLogChannel";

const AdminCommands:Command[] = [
    new SetLogChannelCommand(),
    new MooCommand(),
    new SetChannelAutoRoleCommand(),
    new CommandCommand(),
    new ReactionRoleCommand()
]

export default AdminCommands;