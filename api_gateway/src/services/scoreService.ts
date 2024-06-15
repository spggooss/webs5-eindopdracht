import * as dotenv from 'dotenv';
import CircuitBreaker from 'opossum';
import {callService} from "../api_helper";
import FormData from "form-data";

dotenv.config();

const targetService = process.env.TARGET_SERVICE_URL;

if (targetService === undefined) {
    throw new Error('TARGET_SERVICE_URL is not set');
}

const circuitBreakerOptions = {
    timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 10000, // After 10 seconds, try again.
};
const breaker = new CircuitBreaker(callService, circuitBreakerOptions);
breaker.fallback(() => "Sorry, out of service right now");
breaker.on("fallback", (result: any) => {
    console.log(result);
});


export function getTargets(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
        //+++circuit breaker patroon +++++++++++++++++++++++++++++++++++++++++++
        /*
         implementeer hier de circuitBreaker fire method. Daarmee zorg je
         ervoor dat je request verloopt via je circuitbreaker
        */
        breaker
            .fire("get", targetService, '/targets', req.body)
            .then(resolve)
            .catch(reject);


    })
}

export function addTarget(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
        //+++circuit breaker patroon +++++++++++++++++++++++++++++++++++++++++++
        /*
         implementeer hier de circuitBreaker fire method. Daarmee zorg je
         ervoor dat je request verloopt via je circuitbreaker
        */
        const form = new FormData();
        form.append('image', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });
        form.append('location', req.body.location);
        form.append('description', req.body.description);


        breaker
            .fire("post", targetService, '/target', form)
            .then(resolve)
            .catch(reject);


    })
}

export function getTargetById(req: any): Promise<any> {
    return new Promise((resolve, reject) => {
        //+++circuit breaker patroon +++++++++++++++++++++++++++++++++++++++++++
        /*
         implementeer hier de circuitBreaker fire method. Daarmee zorg je
         ervoor dat je request verloopt via je circuitbreaker
        */
        breaker
            .fire("get", targetService, '/targets/' + req.params.id, req.body)
            .then(resolve)
            .catch(reject);


    })
}


//gebruik de .fallback(()=>{}) functie om bijv. een bericht naar de gebruiker te sturen.
//Deze kun je hier maken.

//Helper functie om het gedoe met slashes te voorkomen



