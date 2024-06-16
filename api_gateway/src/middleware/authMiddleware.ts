import passport from 'passport';
import passportJWT from 'passport-jwt';
import dotenv from 'dotenv';

dotenv.config();

const { ExtractJwt, Strategy: JwtStrategy } = passportJWT;

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.SECRET_KEY as string,
};

const jwtStrategy = new JwtStrategy(jwtOptions, (payload: any, done: (arg0: null, arg1: any) => any) => {
    return done(null, payload ?? false);
});

passport.use(jwtStrategy);

import { Request, Response, NextFunction } from 'express';

export const isLoggedIn = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: Express.User | undefined) => {
        if (err || !user) {
            return res.json({ status: 401, message: 'Unauthorized' });
        }
        console.error(user)
        req.user = user;
        return next();
    })(req, res, next);
};

export const hasRole = (role: string) => (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === role) {
        return next();
    } else {
        return res.json({ status: 403, message: 'Forbidden' });
    }
};

export const hasTargetOwnership = (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin' && req.user.targets.includes(req.params.id)) {
        return next();
    } else {
        return res.json({ status: 403, message: 'Forbidden' });
    }
}
