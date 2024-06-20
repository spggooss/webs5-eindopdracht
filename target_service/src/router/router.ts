import {Router} from 'express';
import {targetRouter} from "./targetRouter";
import {submissionRouter} from "./submissionRouter";


const router = Router();

router.use(targetRouter);
router.use(submissionRouter);

export {router};
