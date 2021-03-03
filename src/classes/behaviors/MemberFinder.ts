import { Guild } from "discord.js";
import MemberModel from "../dataModels/MemberModel";
import RepositoryFactory from "../RepositoryFactory";

export class MemberFinder {
    public static FindMember = async(guild: Guild, searchArg: string) : Promise<MemberModel[]> => {
        const repo = await RepositoryFactory.getInstanceAsync();
        // If this is straight numeric, search by ID
        if (/^(\d+)$/.test(searchArg)) {
            const memberById = await repo.Members.select(guild.id, searchArg);
            if (memberById === undefined){
                // Let's see if they're just missing from the db for some reason and try to look for them
                const gMember = guild.members.cache.get(searchArg);
                if (gMember === undefined) return [];
                // Add them to the database and return the new GuildMember
                const m = new MemberModel(gMember);
                await repo.Members.insert(m);
                return [m];
            }
            return memberById ? [memberById] : []; // Return the single member or empty array
        }
        // Test to see if this is a username#discriminator pattern
        const discriminatorTest = /^(.+)#(\d{4})$/.exec(searchArg);
        if (discriminatorTest) {
            // Search by username & discriminator
            const uname = discriminatorTest[1];
            const udisc = discriminatorTest[2];
            return await repo.Members.selectUsernameDiscriminator(guild.id, uname, udisc);
        }
        // Search by only username
        return await repo.Members.selectUsername(guild.id, searchArg);
    }

    public static FormatMember = (member: MemberModel) : string => {
        if (member.nickname) {
            return `${member.user_id} - ${member.user_name}#${member.user_discriminator} (${member.nickname})`;
        }
        return `${member.user_id} - ${member.user_name}#${member.user_discriminator}`;
    }
}