import { Message, MessageEmbed, Role } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { MemberFinder } from "../../behaviors/MemberFinder";
import { Command } from "../Command";
import PermissionList from '../../utils/permissions';
import RepositoryFactory from "../../RepositoryFactory";

class WhoisCommand extends Command {
    constructor(){
        super({
            name: 'whois',
            category: 'info',
            usage: 'whois [member mention/ID]',
            description: 'Displays information on the provided member',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['KICK_MEMBERS'],
            logByDefault: false
        });
    }

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;
        const repo = await RepositoryFactory.getInstanceAsync();

        let memberId = this.extractMemberIDFromMention(message, args[0]) || args[0];
        if (memberId === undefined) {
            memberId = message.member.id;
        }
        const memberMatches = await MemberFinder.FindMember(guild, memberId);
        if (memberMatches.length === 0){
            // Error message
            return;
        }

        if (memberMatches.length > 1) {
            // More than one member returned... ask for more detail
            const firstTenMembers = memberMatches.slice(0, 10);
            const matchEmbed = new MessageEmbed()
                .setTitle(`Members matching: ${args[0]} [${memberMatches.length}]`)
                .setTimestamp()
                .setDescription(firstTenMembers.map(x => MemberFinder.FormatMember(x)).join('\n') + ((memberMatches.length > 10) ? '\n... more ...' : ''));
            message.channel.send(matchEmbed);
            return;
        }
        const gMember = memberMatches[0];
        const member = guild.members.cache.get(gMember.user_id);
        let roles: Role[] = [];
        let roleList: string | null = null;
        const permArray: string[] = [];

        if (member !== undefined) {
            roles = member.roles.cache.array().filter(x => x.id !== message.guild?.id);
            roleList = roles.join(' ');

            // Administrator covers all, so... just abbreviate
            if (member.hasPermission('ADMINISTRATOR')) {
                permArray.push('Administrator');
            } else {
                const memberPermissions = Object.values(PermissionList).filter(x => x.showWhois).sort((a,b) => (a.sortOrder > b.sortOrder) ? 1 : -1);
                memberPermissions.forEach(p => {
                    if (member.permissions.has(p.permission)) {
                        permArray.push(p.description);
                    }
                });
            }
        }

        const embed = new MessageEmbed()
            .setAuthor(`${gMember.user_name}#${gMember.user_discriminator}`, member?.user.avatarURL() || undefined)
            .setDescription(member)
            .setThumbnail(member?.user.avatarURL({ dynamic: true }) || '')
            .addField('Joined', member?.joinedAt || gMember.joinedTimestamp, true)
            .addField('Registered', member?.user.createdAt, true)
            .setFooter(gMember.user_id)
            .setTimestamp()
            .setColor(member?.displayHexColor || message.guild.me.displayHexColor);
        if (gMember.bot) {
            embed.addField('Bot', 'True', true);
        }
        if (gMember.nickname) {
            embed.addField('Nickname', gMember.nickname, true);
        }
        if (roles.length > 0) {
            embed.addField(`Roles [${roles.length}]`, roleList)
        }
        if (permArray.length > 0) {
            embed.addField('Notable Permissions', permArray.join(', '))
        }
        message.channel.send(embed);

        await StaffLog.FromCommand(this, message)?.send();
    }
}

export default WhoisCommand;