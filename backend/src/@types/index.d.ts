import { IUser } from "../models/user.model.js";

declare global {
    namespace Express {
        interface User extends IUser {
            _id?: any;
        }
    }
}

// Extend Express Request interface
declare module 'express-serve-static-core' {
    interface Request {
        user?: Express.User;
    }
}
