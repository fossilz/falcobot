import { GuildChannel, Guild, Role, VoiceChannel, GuildMember } from "discord.js";
import ChannelModel from "../dataModels/ChannelModel";
import GuildModel from '../dataModels/GuildModel';
import RoleModel from '../dataModels/RoleModel';
import RepositoryFactory from "../RepositoryFactory";
import CommandList from '../commands';
import CommandModel from "../dataModels/CommandModel";
import Repository from "../Repository";
import { asyncForEach } from "../utils/functions";
import MemberModel from "../dataModels/MemberModel";
import { ReactionRoleHandler } from './ReactionRoleHandler';
import { MassRoleHandler } from "./MassRoleHandler";
import DiscordClient from "../DiscordClient";
import { NewEggShuffleHandler } from "./NewEggShuffleHandler";
import ShuffleHistoryModel from "../dataModels/ShuffleHistoryModel";

export default class GuildResolver {
    public static ResolveGuild = async(client: DiscordClient, guild: Guild) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        var newGuild = new GuildModel(guild);
        await repo.Guilds.insert(newGuild);

        const roles = guild.roles.cache.array();
        const channels = guild.channels.cache.array();
        await GuildResolver.ResolveGuildRoles(repo, guild, roles, channels);

        await asyncForEach(channels, async (channel: GuildChannel) => {
            var c = new ChannelModel(channel);
            await repo.Channels.insert(c);
        });

        await GuildResolver.ResolveGuildMembers(repo, guild);

        // Insert all reserved (system) commands
        await asyncForEach(CommandList, async (command) => {
            var commandModel = new CommandModel(guild.id, command);
            await repo.Commands.insert(commandModel);
        });

        // Setup reaction role listeners:
        await ReactionRoleHandler.SetupAllReactionRoleListenersForGuildAsync(guild);

        // Setup mass role queue workers:
        await MassRoleHandler.SetupAllMassRoleWorkersForGuildAsync(guild);
        
        // Setup the shuffle listener event
        client.on('neweggShuffle', async (historyModel: ShuffleHistoryModel|undefined) => await NewEggShuffleHandler.handleShuffleForGuildAsync(guild, historyModel));
    }

    private static ResolveGuildMembers = async(repo: Repository, guild: Guild) : Promise<void> => {
        const members = guild.members.cache.array();
        const guildMembers = await repo.Members.selectAll(guild.id);

        const excessMembers = guildMembers.filter(x => members.find(m => m.user.id == x.user_id) === undefined);
        await asyncForEach(excessMembers, async (member: MemberModel) => {
            await repo.Members.updateDeleted(guild.id, member.user_id, true);
        });

        await asyncForEach(members, async (member: GuildMember) => {
            const memberModel = new MemberModel(member);
            await repo.Members.insert(memberModel);
        });
    }

    private static ResolveGuildRoles = async(repo: Repository, guild: Guild, roles: Role[], channels: GuildChannel[]) : Promise<void> => {
        const roleModels = await repo.Roles.selectAll(guild.id);

        const excessRoles = roleModels.filter((rm) => roles.find((r) => r.id == rm.role_id) === undefined);
        await asyncForEach(excessRoles, async (r) => {
            await repo.Roles.delete(guild.id, r.role_id);
        });

        await asyncForEach(roles, async (role: Role) => {
            var newRole = new RoleModel(role);
            await repo.Roles.insert(newRole);
        });

        let muteRole = roles.find(r => r.name.toLowerCase() === 'muted');
        if (!muteRole) {
            try {
                muteRole = await guild.roles.create({
                    data: {
                      name: 'Muted',
                      permissions: [],
                      color: 4211787
                    }
                  });
                await repo.Guilds.updateMuteRole(guild.id, muteRole.id);
            } catch(err) {
                console.error(err.message);
            }
            await asyncForEach(channels, async (channel: GuildChannel) => {
                await GuildResolver.AddChannelToMuteRole(muteRole, channel, guild.me);
            });
        }
    }

    public static GetMuteRoleForGuild = (guild: Guild) : Role | undefined => {
        const roles = guild.roles.cache.array();
        return roles.find(r => r.name.toLowerCase() === 'muted');
    }

    public static AddChannelToMuteRole = async(muteRole: Role | undefined, channel: GuildChannel, me: GuildMember | null) => {
        if (muteRole === undefined || me === null) {
            return;
        }
        if (!channel.viewable || !channel.permissionsFor(me)?.has('MANAGE_ROLES')) {
            return;
        }
        try {
            if (channel.type === 'text') // Deny permissions in text channels
                await channel.updateOverwrite(muteRole, {
                'SEND_MESSAGES': false,
                'ADD_REACTIONS': false
                });
            else if (channel instanceof VoiceChannel && channel.editable) // Deny permissions in voice channels
                await channel.updateOverwrite(muteRole, {
                'SPEAK': false,
                'STREAM': false
                });
        } catch (err) {
            console.error(err.stack);
        }
    }
}