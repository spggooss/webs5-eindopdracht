import {Router} from 'express';
import {authRouter} from "./authRouter";
import {targetRouter} from "./targetRouter";

const router = Router();

router.use(authRouter);
router.use(targetRouter);

export {router};
