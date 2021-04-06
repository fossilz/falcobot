import { Message, MessageEmbed } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";
import PermissionList from '../../utils/permissions';
import { CommandExecutionParameters } from "../../behaviors/CommandHandler";

class RoleInfoCommand extends Command {
    constructor(){
        super({
            name: 'roleinfo',
            category: 'info',
            usage: 'roleinfo <role mention/ID>',
            description: 'Displays information on the provided role',
            clientPermissions: ['SEND_MESSAGES', 'EMBED_LINKS'],
            defaultUserPermissions: ['MANAGE_ROLES'],
            logByDefault: false
        });
    }

    run = async (message: Message, args: string[], executionParameters?: CommandExecutionParameters) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        const guild = message.guild;
        const member = message.member;
        if (guild.me === null) return;
        const staffLog = StaffLog.FromCommandContext(this, guild, message.author, message.channel, message.content, executionParameters);
        
        const role = Command.extractRoleMention(guild, args[0]) || guild.roles.cache.get(args[0]);
        if (role == undefined) {
            Command.error('No role found.', executionParameters);
            return;
        }
        if (!member.hasPermission('ADMINISTRATOR') && role.position > member.roles.highest.position) {
            Command.error('Cannot get role info on a role above your own.', executionParameters);
            return;
        }

        // Get role permissions
        const permArray: string[] = [];
        const roleInfoPermissions = Object.values(PermissionList).filter(x => x.showRoleInfo).sort((a,b) => (a.sortOrder > b.sortOrder) ? 1 : -1);
        roleInfoPermissions.forEach(p => {
            if (role.permissions.has(p.permission)) {
                permArray.push(p.description);
            }
        });

        // Reverse role position
        const position = `\`${guild.roles.cache.size - role.position}\`/\`${guild.roles.cache.size}\``;

        const embed = new MessageEmbed()
            .setTitle('Role Information')
            .setThumbnail(guild.iconURL({ dynamic: true }) || '')
            .addField('Role', role, true)
            .addField('Role ID', `\`${role.id}\``, true)
            .addField('Position', position, true)
            .addField('Mentionable', `\`${role.mentionable}\``, true)
            .addField('Bot Role', `\`${role.managed}\``, true)
            .addField('Color', `\`${role.hexColor.toUpperCase()}\``, true)
            .addField('Members', `\`${role.members.size}\``, true)
            .addField('Hoisted', `\`${role.hoist}\``, true)
            .addField('Created On', `\`${role.createdAt}\``, true)
            .addField('Permissions', `\`\`\`${permArray.join(', ')}\`\`\``)
            .setFooter(member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(role.hexColor);
        Command.send(embed, executionParameters);

        await staffLog?.send();
    }
}

export default RoleInfoCommand;