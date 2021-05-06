import { Request } from 'express';
import User from './user.interface';

export default interface RequestWithUser extends Request {
    user?: User; // Note, this must be an optional property or Express won't build correctly
}