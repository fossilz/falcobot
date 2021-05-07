import HttpException from './httpException';

export default class InvalidGuildException extends HttpException {
    constructor(guildId: string){
        super(404, `Cannot find guild: ${guildId}`);
    }
}