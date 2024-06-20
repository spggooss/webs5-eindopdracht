import * as dotenv from 'dotenv';
// @ts-ignore
import CircuitBreaker from 'opossum';
import {callService} from "../api_helper";
// @ts-ignore
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


//gebruik de .fallback(()=>{}) functie om bijv. een bericht naar de gebruiker te sturen.
//Deze kun je hier maken.

//Helper functie om het gedoe met slashes te voorkomen



