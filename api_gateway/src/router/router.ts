import {Router} from 'express';
import {authRouter} from "./authRouter";
import {targetRouter} from "./targetRouter";
import {submissionsRouter} from "./submissionRouter"

const router = Router();

router.use(authRouter);
router.use(targetRouter);
router.use(submissionsRouter);

export {router};
