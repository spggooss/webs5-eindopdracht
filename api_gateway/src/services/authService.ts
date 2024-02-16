import * as dotenv from 'dotenv';
import CircuitBreaker from 'opossum';
import {callService} from "../api_helper";

dotenv.config();

const authService = process.env.AUTH_SERVICE_URL;

if (authService === undefined) {
    throw new Error('AUTH_SERVICE_URL is not set');
}

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
            .fire("post", authService, '/register', body)
            .then(resolve)
            .catch(reject);


    })
}

export function loginPost(body: any): Promise<any> {
    return new Promise((resolve, reject) => {
        //+++circuit breaker patroon +++++++++++++++++++++++++++++++++++++++++++
        /*
         implementeer hier de circuitBreaker fire method. Daarmee zorg je
         ervoor dat je request verloopt via je circuitbreaker
        */
        breaker
            .fire("post", authService, '/login', body)
            .then(resolve)
            .catch(reject);


    })
}


//gebruik de .fallback(()=>{}) functie om bijv. een bericht naar de gebruiker te sturen.
//Deze kun je hier maken.




