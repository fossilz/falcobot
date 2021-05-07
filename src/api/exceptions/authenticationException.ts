import HttpException from './httpException';

export default class AuthenticationException extends HttpException {
    constructor(){
        super(401, "Invalid authentication provided");
    }
}