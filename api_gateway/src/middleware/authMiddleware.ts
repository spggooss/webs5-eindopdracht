import passport from 'passport';
import passportJWT from 'passport-jwt';
import dotenv from 'dotenv';
import { Response, NextFunction } from 'express';
import {getUserSubmissions, getUserTargets} from "../services/authService";
import {RequestCustom, User} from "../router/types";

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

export const isLoggedIn = (req: RequestCustom, res: Response, next: NextFunction) => {
    passport.authenticate('jwt', { session: false }, (err: any, user: User) => {
        if (err || !user) {
            return res.status(401).json({message: 'Unauthorized' });
        }
        req.user = user;
        return next();
    })(req, res, next);
};

export const hasRole = (role: string) => (req: RequestCustom, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === role) {
        return next();
    } else {
        return res.status(403).json({ message: 'Forbidden' });
    }
};

export const hasTargetOwnership = async (req: RequestCustom, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === 'admin') {
        const response = await getUserTargets(req.user.id, req.body);

        const userTargets = response.data;

        if(req.params.id) {
            const targetId = parseInt(req.params.id);

            if (userTargets.length > 0 && userTargets.some((target: { targetId: number; }) => target.targetId === targetId)) {
                return next();
            } else{
                return res.status(403).json({message: 'Forbidden'});
            }
        }

        return next();
    } else {
        return res.status(403).json({message: 'Forbidden'});
    }
}

export const hasSubmissionOwnership = async (req: RequestCustom, res: Response, next: NextFunction) => {
    if (req.user) {
        const response = await getUserSubmissions(req.user.id, req.body);

        const userSubmissions = response.data;

        if(req.params.id) {
            const submissionId = parseInt(req.params.id);
            if (userSubmissions.length > 0 && userSubmissions.some((submission: { submissionId: number; }) => submission.submissionId === submissionId)) {
                return next();
            } else{
                return res.status(403).json({message: 'Forbidden'});
            }
        }

        return next();
    } else {
        return res.status(403).json({message: 'Forbidden'});
    }
}
