import { Role } from "discord.js";

export class RolePingHandler {
    public static AllowRolePingAsync = async (role: Role|undefined, wrappedFunc: () => Promise<unknown>) => {
        if (role === undefined || role.mentionable){
            await wrappedFunc();
            return;
        }
        await role.edit({mentionable : true}, "Temporarily mentionable for ping");
        await wrappedFunc();
        await role.edit({mentionable : false}, "Reset configuration");
    }
}