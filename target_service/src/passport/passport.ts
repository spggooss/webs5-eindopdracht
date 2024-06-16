import {PassportStatic} from "passport";
import {ExtractJwt, Strategy as JWTStrategy} from "passport-jwt";

const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'secretqwerty1234'
};
export default (passport: PassportStatic) => {
    passport.use(new JWTStrategy(jwtOptions, (jwt_payload: { TARGET_SERVICE_API_KEY: string }, done) => {
        if (jwt_payload.TARGET_SERVICE_API_KEY === process.env.API_KEY) {
            return done(null, true);
        }
        return done(null, false);
    }));
};