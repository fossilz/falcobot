import { Response, NextFunction } from "express";
import RequestWithUser from "../interfaces/requestWithUser.interface";
import { API_STATIC_TOKEN, API_STATIC_USERID } from "../../config";

export default async function authenticate(req: RequestWithUser, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        if (token === API_STATIC_TOKEN){
            req.user = { userId: API_STATIC_USERID };
            next();
        } else {
            res.sendStatus(403);
        }

    } else {
        res.sendStatus(401);
    }
}