import { Message, MessageEmbed } from "discord.js";
import { StaffLog } from "../../behaviors/StaffLog";
import { Command } from "../Command";

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

    run = async (message: Message, args: string[]) : Promise<void> => {
        if (message.guild === null || message.guild.me === null || message.member === null) return;
        
        const role = this.extractRoleMention(message, args[0]) || message.guild.roles.cache.get(args[0]);
        if (role == undefined) {
            // Error message
            return;
        }
        if (!message.member.hasPermission('ADMINISTRATOR') && role.position > message.member.roles.highest.position) {
            // Error message - no info on a role higher than own
            return;
        }

        // Get role permissions
        const rolePermissions = role.permissions.toArray();

        // Reverse role position
        const position = `\`${message.guild.roles.cache.size - role.position}\`/\`${message.guild.roles.cache.size}\``;

        const embed = new MessageEmbed()
            .setTitle('Role Information')
            .setThumbnail(message.guild.iconURL({ dynamic: true }) || '')
            .addField('Role', role, true)
            .addField('Role ID', `\`${role.id}\``, true)
            .addField('Position', position, true)
            .addField('Mentionable', `\`${role.mentionable}\``, true)
            .addField('Bot Role', `\`${role.managed}\``, true)
            .addField('Color', `\`${role.hexColor.toUpperCase()}\``, true)
            .addField('Members', `\`${role.members.size}\``, true)
            .addField('Hoisted', `\`${role.hoist}\``, true)
            .addField('Created On', `\`${role.createdAt}\``, true)
            .addField('Permissions', `\`\`\`${rolePermissions.join(', ')}\`\`\``)
            .setFooter(message.member.displayName,  message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setColor(role.hexColor);
        message.channel.send(embed);

        await StaffLog.FromCommand(this, message)?.send();
    }
}

export default RoleInfoCommand;