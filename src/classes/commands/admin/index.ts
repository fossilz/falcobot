import { Command } from '../Command';
import { CommandCommands } from './command';
import MooCommand from './moo';
import { ReactionRoleCommands } from './reactionRole';
import PermissionSetCommand from './permissionSet';
import SetChannelAutoRoleCommand from './setChannelAutoRole';
import SetLogChannelCommand from "./setLogChannel";
import SetPrefixCommand from './setPrefix';
import AutoRoleCommand from './autoRole';
import { RoleCommands } from './role';
import { ShuffleConfigCommand } from './shuffleconfig';
import { MessageCollectionCommands } from './messageCollection';

const AdminCommands:Command[] = [
    new SetLogChannelCommand(),
    new MooCommand(),
    new SetChannelAutoRoleCommand(),
    new PermissionSetCommand(),
    new SetPrefixCommand(),
    new AutoRoleCommand(),
    new ShuffleConfigCommand()
]
.concat(CommandCommands)
.concat(ReactionRoleCommands)
.concat(RoleCommands)
.concat(MessageCollectionCommands);

export default AdminCommands;