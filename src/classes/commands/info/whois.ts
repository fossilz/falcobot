import { Message, MessageEmbed } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import PermissionList from '../../utils/permissions';

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

        const member = this.extractMemberMention(message, args[0]) || message.guild.members.cache.get(args[0]) || message.member;

        const roles = member.roles.cache.array().filter(x => x.id !== message.guild?.id);
        const roleList = roles.join(' ');

        const permArray: string[] = [];
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

        const embed = new MessageEmbed()
            .setAuthor(member.user.username, member.user.avatarURL() || undefined)
            .setDescription(member)
            .setThumbnail(member.user.avatarURL({ dynamic: true }) || '')
            .addField('Joined', member.joinedAt, true)
            .addField('Registered', member.user.createdAt, true)
            .setFooter(member.user.id)
            .setTimestamp()
            .setColor(member.displayHexColor);
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