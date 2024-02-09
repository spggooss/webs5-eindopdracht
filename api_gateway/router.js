require('dotenv').config();
const express        = require('express');
const router         = new express.Router();
const axios          = require('axios');
const CircuitBreaker = require('opossum');
const {config} = require("dotenv");
const postService    = process.env.postService   //Haal dit uit environment variables
const jwt = require('jsonwebtoken');



const circuitBreakerOptions = {
    timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
    errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
    resetTimeout: 10000, // After 10 seconds, try again.
};
const breaker = new CircuitBreaker(callService, circuitBreakerOptions);
breaker.fallback(() => "Sorry, out of service right now");
breaker.on("fallback", (result) => {
    console.log(result);
});
breaker.on("success", () => console.log("success"));
breaker.on("failure", () => console.log("failed"));
breaker.on("timeout", () => console.log("timed out"));
breaker.on("reject", () => console.log("rejected"));
breaker.on("open", () => console.log("opened"));
breaker.on("halfOpen", () => console.log("halfOpened"));
breaker.on("close", () => console.log("closed"));


router.post( '/posts', ( req, res ) => {
    let value = req.body;
    if( !value ) return res.send( 'body is leeg!' );
    //+++circuit breaker patroon +++++++++++++++++++++++++++++++++++++++++++
    /*
     implementeer hier de circuitBreaker fire method. Daarmee zorg je
     ervoor dat je request verloopt via je circuitbreaker
    */

    breaker
        .fire("post", )
        .then(console.log)
        .catch(console.error);
})

function callService(method,serviceAddress,resource,body){return new Promise(( resolve,reject )=>{
    serviceAddress = formatWithSlashes( serviceAddress );
    if( method === 'post' ){
        axios.post(`${ serviceAddress }${ resource }`,body )
            .then(( mess )=>{
                resolve( 'van blogrouter : '+ mess.data);
            }).catch(( e )=>{
            console.log('Error door axios ' + e.toString())
            reject( 'Error tijdens request in axios');
        });

    }else{
        axios.get(`${serviceAddress}${resource}`)
            .then((mess)=>{
                resolve('van response blogroute : ' + mess.data);
            })
    }
})
}
//gebruik de .fallback(()=>{}) functie om bijv. een bericht naar de gebruiker te sturen.
//Deze kun je hier maken.

//Helper functie om het gedoe met slashes te voorkomen
function formatWithSlashes(serviceAddress){
    return (postService.endsWith('/'))? serviceAddress : '/';
}

module.exports = router