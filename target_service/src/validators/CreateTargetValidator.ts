import {NextFunction, Request, Response} from 'express';
// @ts-ignore
import joi from 'joi';

import JoiDate from "@joi/date";

const Joi = joi.extend(JoiDate);

const exceptionMessages = {
    'string.base': '{{#label}} should be a type of \'text\'',
    'string.empty': '{{#label}} cannot be an empty field',
    'string.min': '{{#label}} should have a minimum length of {#limit}',
    'any.required': '{{#label}} is a required field',
    'date.base': '{{#label}} should be a type of \'date\'',
    'date.empty': '{{#label}} cannot be an empty field',
    'date.required': '{{#label}} is a required field',

};

const createTargetSchema = Joi.object({
    userId: Joi.string()
        .min(3).max(30).required()
        .messages(exceptionMessages),
    location: Joi.string().required()
        .messages(exceptionMessages),
    image: Joi.any().required()
        .messages(exceptionMessages),
    date: Joi.date().format('YYYY-MM-DD HH:mm:ss').required()
        .messages(exceptionMessages),
});

function CreateTargetValidator(req: Request, res: Response, next: NextFunction) {
    console.log(req.body);
    const {error} = createTargetSchema.validate(req.body);
    if (error) {
        const {details} = error;
        // @ts-ignore
        const errorMessages = details.map(({message}) => message);
        return res.json({status: 400, data: { status: 'Validation Error', details: errorMessages}});
    }

    return next();
}

export {CreateTargetValidator};
