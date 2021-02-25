import { Command } from '../Command';
import SetLogChannelCommand from "./setLogChannel";

const AdminCommands:Command[] = [
    new SetLogChannelCommand()
]

export default AdminCommands;