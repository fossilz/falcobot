import { GuildChannel, Guild, Role, VoiceChannel } from "discord.js";
import ChannelModel from "../dataModels/ChannelModel";
import GuildModel from '../dataModels/GuildModel';
import RoleModel from '../dataModels/RoleModel';
import RepositoryFactory from "../RepositoryFactory";
import CommandList from '../commands';
import CommandModel from "../dataModels/CommandModel";
import Repository from "../Repository";

export default class GuildResolver {
    public static ResolveGuild = async(guild: Guild) => {
        const repo = await RepositoryFactory.getInstanceAsync();

        var newGuild = new GuildModel(guild);
        await repo.Guilds.insert(newGuild);

        const roles = guild.roles.cache.array();
        const channels = guild.channels.cache.array();
        await GuildResolver.ResolveGuildRoles(repo, guild, roles, channels);

        channels.forEach(async (channel: GuildChannel) => {
            var c = new ChannelModel(channel);
            await repo.Channels.insert(c);
        });

        // Insert all reserved (system) commands
        CommandList.forEach(async (command) => {
            var commandModel = new CommandModel(guild.id, command);
            await repo.Commands.insert(commandModel);
        });
    }

    private static ResolveGuildRoles = async(repo: Repository, guild: Guild, roles: Role[], channels: GuildChannel[]) : Promise<void> => {
        const roleModels = await repo.Roles.selectAll(guild.id);

        const excessRoles = roleModels.filter((rm) => roles.find((r) => r.id == rm.role_id) === undefined);
        excessRoles.forEach(async (r) => {
            repo.Roles.delete(guild.id, r.role_id);
        });

        roles.forEach(async (role: Role) => {
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
            } catch(err) {
                console.error(err.message);
            }
            channels.forEach(async (channel: GuildChannel) => {
                try {
                    if (guild.me === null || muteRole === undefined) return;
                    if (channel.viewable && channel.permissionsFor(guild.me)?.has('MANAGE_ROLES')) {
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
                    }
                } catch (err) {
                    console.error(err.stack);
                }
            })
        }
    }
}