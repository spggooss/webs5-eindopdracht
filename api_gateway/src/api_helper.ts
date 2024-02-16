import axios from "axios";
import {generateJWT} from "./helpers/generateApiJwt";

axios.interceptors.request.use(req => {
    req.headers.authorization = generateJWT();

    return req;
});

export function callService(method: string, serviceAddress: any, resource: any, body: any) {
    return new Promise((resolve, reject) => {
        if (method === 'post') {
            axios.post(`${serviceAddress}${resource}`, body)
                .then((mess) => {
                    resolve(mess.data);
                }).catch((e) => {
                reject(e);
            });

        } else if (method === 'get') {
            axios.get(`${serviceAddress}${resource}`)
                .then((mess) => {
                    resolve(mess.data);
                }).catch((e) => {
                reject(e);
            });
        } else if (method === 'put') {
            axios.put(`${serviceAddress}${resource}`, body)
                .then((mess) => {
                    resolve(mess.data);
                }).catch((e) => {
                reject(e);
            });
        } else if (method === 'delete') {
            axios.delete(`${serviceAddress}${resource}`)
                .then((mess) => {
                    resolve(mess.data);
                }).catch((e) => {
                reject(e);
            });
        }
    })
}


