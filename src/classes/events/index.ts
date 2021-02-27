import message from './message';
import ready from './ready';
import guildCreate from './guildCreate';
import guildDelete from './guildDelete';
import roleCreate from './roleCreate';
import roleDelete from './roleDelete';
import roleUpdate from './roleUpdate';
import channelCreate from './channelCreate';
import channelDelete from './channelDelete';
import channelUpdate from './channelUpdate';
import voiceStateUpdate from './voiceStateUpdate';

export default [
    message,
    ready,
    guildCreate,
    guildDelete,
    roleCreate,
    roleDelete,
    roleUpdate,
    channelCreate,
    channelDelete,
    channelUpdate,
    voiceStateUpdate
];