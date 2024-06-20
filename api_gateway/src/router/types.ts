import {Request} from "express";

export interface User {
    id: string,
    role: string,
    targets: string[]
}

export interface RequestCustom extends Request
{
    user?: User;
}