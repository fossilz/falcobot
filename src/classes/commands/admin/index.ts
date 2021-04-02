import { Command } from '../Command';
import CommandCommand from './command';
import MooCommand from './moo';
import ReactionRoleCommand from './reactionRole';
import PermissionSetCommand from './permissionSet';
import SetChannelAutoRoleCommand from './setChannelAutoRole';
import SetLogChannelCommand from "./setLogChannel";

const AdminCommands:Command[] = [
    new SetLogChannelCommand(),
    new MooCommand(),
    new SetChannelAutoRoleCommand(),
    new CommandCommand(),
    new ReactionRoleCommand(),
    new PermissionSetCommand()
]

export default AdminCommands;