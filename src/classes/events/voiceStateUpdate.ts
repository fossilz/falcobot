import { Guild, Role, VoiceState } from "discord.js";
import DiscordClient from "../DiscordClient";
import Repository from "../Repository";
import RepositoryFactory from "../RepositoryFactory";
import IEventHandler from "./IEventHandler"
import { MemberRoleHelper } from '../behaviors/MemberRoleHelper';

const handler: IEventHandler = {
    eventName: "voiceStateUpdate",
    handler: async (_: DiscordClient, oldState: VoiceState, newState: VoiceState) => {
        const repo = await RepositoryFactory.getInstanceAsync();
        const guild = newState.guild;
        const member = guild.members.cache.get(newState.id);
        if (member === undefined) {
            return;
        }

        const newVoiceChannel = newState.channelID;
        const oldVoiceChannel = oldState.channelID;

        // Test for channel join
        if (newVoiceChannel !== null) {
            if (newVoiceChannel !== oldVoiceChannel) {
                // Join newVoiceChannel
                const newRole = await getAutoRole(repo, guild, newVoiceChannel);
                if (newRole !== undefined) {
                    await MemberRoleHelper.TryAssignRole(member, newRole);
                }
            }
        }

        // Test for channel leave
        if (oldVoiceChannel !== null) {
            if (oldVoiceChannel !== newVoiceChannel) {
                // Leave oldVoiceChannel
                const oldRole = await getAutoRole(repo, guild, oldVoiceChannel);
                if (oldRole != undefined) {
                    await MemberRoleHelper.TryRemoveRole(member, oldRole);
                }
            }
        }

    }
};

const getAutoRole = async (repo: Repository, guild: Guild, channel_id: string) : Promise<Role | undefined> => {
    const channel = await repo.Channels.select(guild.id, channel_id);
    if (channel === undefined || channel.joinAutoRole_id === null) return;
    return guild.roles.cache.get(channel.joinAutoRole_id);
}

export default handler;