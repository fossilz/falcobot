import { Command } from '../Command';
import CommandCommand from './command';
import MooCommand from './moo';
import ReactionRoleCommand from './reactionRole';
import PermissionSetCommand from './permissionSet';
import SetChannelAutoRoleCommand from './setChannelAutoRole';
import SetLogChannelCommand from "./setLogChannel";
import SetPrefixCommand from './setPrefix';
import AutoRoleCommand from './autoRole';

const AdminCommands:Command[] = [
    new SetLogChannelCommand(),
    new MooCommand(),
    new SetChannelAutoRoleCommand(),
    new CommandCommand(),
    new ReactionRoleCommand(),
    new PermissionSetCommand(),
    new SetPrefixCommand(),
    new AutoRoleCommand()
]

export default AdminCommands;