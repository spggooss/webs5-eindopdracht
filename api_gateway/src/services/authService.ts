import * as dotenv from 'dotenv';
import CircuitBreaker from 'opossum';
import {callService} from "../api_helper";
import {User} from "../router/types";

dotenv.config();

const authService = process.env.AUTH_SERVICE_URL;

if (authService === undefined) {
    throw new Error('AUTH_SERVICE_URL is not set');
}

if (!process.env.AUTH_SERVICE_API_KEY) {
    console.error('No API key found');
    process.exit(1);
}

const AUTH_SERVICE_API_KEY: string = process.env.AUTH_SERVICE_API_KEY;

const circuitBreakerOptions = {
    timeout: 5000, // If our function takes longer than 5 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 10000, // After 10 seconds, try again.
};
const breaker = new CircuitBreaker(callService, circuitBreakerOptions);

export function registerPost(body: any): Promise<any> {
    return new Promise((resolve, reject) => {
        //+++circuit breaker patroon +++++++++++++++++++++++++++++++++++++++++++
        /*
         implementeer hier de circuitBreaker fire method. Daarmee zorg je
         ervoor dat je request verloopt via je circuitbreaker
        */
        breaker
            .fire("post", authService, 'register', body, false, AUTH_SERVICE_API_KEY)
            .then(resolve)
            .catch(reject);


    })
}

export function loginPost(body: User | any): Promise<any> {
    return new Promise((resolve, reject) => {
        //+++circuit breaker patroon +++++++++++++++++++++++++++++++++++++++++++
        /*
         implementeer hier de circuitBreaker fire method. Daarmee zorg je
         ervoor dat je request verloopt via je circuitbreaker
        */

        breaker
            .fire("post", authService, 'login', body,false, AUTH_SERVICE_API_KEY)
            .then(resolve)
            .catch(reject);


    })
}

export function getUserTargets(userId: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
        //+++circuit breaker patroon +++++++++++++++++++++++++++++++++++++++++++
        /*
         implementeer hier de circuitBreaker fire method. Daarmee zorg je
         ervoor dat je request verloopt via je circuitbreaker
        */
        breaker
            .fire("get", authService, 'user-targets/' + userId, body, false, AUTH_SERVICE_API_KEY)
            .then(resolve)
            .catch(reject);
    });
}

export function getUserSubmissions(userId: string, body: any): Promise<any> {
    return new Promise((resolve, reject) => {
        //+++circuit breaker patroon +++++++++++++++++++++++++++++++++++++++++++
        /*
         implementeer hier de circuitBreaker fire method. Daarmee zorg je
         ervoor dat je request verloopt via je circuitbreaker
        */
        breaker
            .fire("get", authService, 'user-submissions/' + userId, body, false, AUTH_SERVICE_API_KEY)
            .then(resolve)
            .catch(reject);
    });
}



//gebruik de .fallback(()=>{}) functie om bijv. een bericht naar de gebruiker te sturen.
//Deze kun je hier maken.




