import { Command } from '../Command';
import { CommandCommands } from './command';
import MooCommand from './moo';
import { ReactionRoleCommands } from './reactionRole';
import PermissionSetCommand from './permissionSet';
import SetChannelAutoRoleCommand from './setChannelAutoRole';
import SetLogChannelCommand from "./setLogChannel";
import SetPrefixCommand from './setPrefix';
import AutoRoleCommand from './autoRole';

const AdminCommands:Command[] = [
    new SetLogChannelCommand(),
    new MooCommand(),
    new SetChannelAutoRoleCommand(),
    new PermissionSetCommand(),
    new SetPrefixCommand(),
    new AutoRoleCommand()
]
.concat(CommandCommands)
.concat(ReactionRoleCommands);

export default AdminCommands;