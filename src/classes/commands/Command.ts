import { GuildChannel, GuildMember, Message, PermissionString } from 'discord.js';

export interface ICommandSettings {
    name: string;
    category: string;
    usage?: string;
    description?: string;
    clientPermissions?: PermissionString[];
    defaultUserPermissions?: PermissionString[];
    examples?: string[];
    logByDefault?: boolean;
}

export abstract class Command {
    public name: string;
    public category: string;
    public usage: string;
    public description: string;
    public clientPermissions: PermissionString[];
    public defaultUserPermissions: PermissionString[];
    public examples: string[];
    public logByDefault: boolean;

    constructor(options: ICommandSettings) {
        this.name = options.name;
        this.category = options.category;
        this.usage = options.usage || options.name;
        this.description = options.description || '';
        this.clientPermissions = options.clientPermissions || ['SEND_MESSAGES', 'EMBED_LINKS'];
        this.defaultUserPermissions = options.defaultUserPermissions || [];
        this.examples = options.examples || [];
        this.logByDefault = options.logByDefault ?? true;
    }

    // @ts-ignore: abstract run definition
    run = async (message: Message, args: string[]) : Promise<void> => {
        throw new Error(`The ${this.name} command has no run() method`);
    }

    protected extractChannelMention = (message: Message, mention: string) : GuildChannel | undefined => {
        if (message === null || message.guild === null || mention === undefined || mention === null) return;
        const matches = mention.match(/^<#(\d+)>$/);
        if (matches == null) return;
        const id = matches[1];
        return message.guild.channels.cache.get(id);
    }

    protected extractMemberMention = (message: Message, mention: string) : GuildMember | undefined => {
        if (message === null || message.guild === null || mention === undefined || mention === null) return;
        const matches = mention.match(/^<@!?(\d+)>$/);
        if (matches === null) return;
        const id = matches[1];
        return message.guild.members.cache.get(id);
    }
}