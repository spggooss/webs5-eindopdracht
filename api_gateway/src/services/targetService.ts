import * as dotenv from 'dotenv';
import CircuitBreaker from 'opossum';
import {callService} from "../api_helper";

dotenv.config();


if (!process.env.TARGET_SERVICE_URL) {
    console.error('No secret key found');
    process.exit(1);
}

if (!process.env.TARGET_SERVICE_API_KEY) {
    console.error('No API key found');
    process.exit(1);
}

const TARGET_SERVICE_API_KEY: string = process.env.TARGET_SERVICE_API_KEY;

const targetService = process.env.TARGET_SERVICE_URL;

const circuitBreakerOptions = {
    timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 10000, // After 10 seconds, try again.
};
const breaker = new CircuitBreaker(callService, circuitBreakerOptions);
breaker.fallback(() => "Sorry, out of service right now");
breaker.on("fallback", (result: any) => {
    console.log(`Fallback reason: ${result}`);
});


export function getTargets(req: any): Promise<any> {
    return new Promise((resolve, reject) => {


        let resource = 'targets';
        const queryParams = [];

        if (req.query.page) queryParams.push(`page=${req.query.page}`);
        if (req.query.limit) queryParams.push(`limit=${req.query.limit}`);
        if (req.query.location) queryParams.push(`location=${req.query.location}`);

        if (queryParams.length > 0) {
            resource += '?' + queryParams.join('&');
        }


        breaker
            .fire("get", targetService, resource, req, false, TARGET_SERVICE_API_KEY)
            .then(resolve)
            .catch(error => {
                reject(error);
            });


    })
}

export function addTarget(req: any, form: FormData): Promise<any> {
    return new Promise((resolve, reject) => {

        form.append('user_id', req.user.id);

        breaker
            .fire("post", targetService, 'targets', form, true, TARGET_SERVICE_API_KEY)
            .then(resolve)
            .catch(reject);


    })
}

export function getTargetById(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
        breaker
            .fire("get", targetService, 'targets/' + req.params.id, req.body, false, TARGET_SERVICE_API_KEY)
            .then(response => {
                    resolve(response)
                }
            )
            .catch(error => {
                reject(error);
            });


    })
}

export function getSubmissionsByTargetId(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
        breaker
            .fire("get", targetService, 'targets/' + req.params.id + '/submissions', req.body, false, TARGET_SERVICE_API_KEY)
            .then(response => {
                    resolve(response)
                }
            )
            .catch(error => {
                reject(error);
            });


    })
}

export function getImageByTargetId(req: any): Promise<any> {
    return new Promise((resolve, reject) => {

        breaker
            .fire("get", targetService, 'images/' + req.params.id, req.body, false, TARGET_SERVICE_API_KEY)
            .then(resolve)
            .catch(reject);


    })
}

export function deleteTargetById(req: any): Promise<any> {
    return new Promise((resolve, reject) => {

        breaker
            .fire("delete", targetService, 'targets/' + req.params.id, req.body, false, TARGET_SERVICE_API_KEY)
            .then(resolve)
            .catch(reject);


    })
}

export function addSubmission(req: any, form: FormData): Promise<any> {
    return new Promise((resolve, reject) => {

        form.append('user_id', req.user.id);

        breaker
            .fire("post", targetService, 'submissions', form, true, TARGET_SERVICE_API_KEY)
            .then(resolve)
            .catch(reject);


    })
}

export function deleteSubmissionById(req: any): Promise<any> {
    return new Promise((resolve, reject) => {

        breaker
            .fire("delete", targetService, 'submissions/' + req.params.id, req.body, false, TARGET_SERVICE_API_KEY)
            .then(resolve)
            .catch(reject);


    })
}




