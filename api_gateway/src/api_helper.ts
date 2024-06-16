import axios from "axios";
import {generateJWT} from "./helpers/generateApiJwt";

export function callService(method: string, serviceAddress: any, resource: any, body: any, apiKey: string) {
    return new Promise((resolve, reject) => {
        try {
            const token = generateJWT(apiKey); // Call your function to generate JWT token
            const headers = {
                Authorization: `Bearer ${token}`,
                'content-type': 'multipart/form-data'
            };
            if (method === 'post') {
                console.log(body);
                axios.post(`${serviceAddress}/${resource}`, body, {headers})
                    .then((mess) => {
                        resolve(mess.data);
                    }).catch((e) => {
                        console.log(e);
                    reject(e);
                });

            } else if (method === 'get') {
                axios.get(`${serviceAddress}/${resource}`, {headers})
                    .then((mess) => {
                        resolve(mess.data);
                    }).catch((e) => {
                        console.log(e);
                    reject(e);
                });
            } else if (method === 'put') {
                axios.put(`${serviceAddress}/${resource}`, body, {headers})
                    .then((mess) => {
                        resolve(mess.data);
                    }).catch((e) => {
                    reject(e);
                });
            } else if (method === 'delete') {
                axios.delete(`${serviceAddress}/${resource}`, {headers})
                    .then((mess) => {
                        resolve(mess.data);
                    }).catch((e) => {
                    reject(e);
                });
            }
        } catch (e) {
            reject(e);
        }
    })
}


