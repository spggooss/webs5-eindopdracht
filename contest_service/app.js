require('dotenv').config();
require('../authservice/database/mongooseConnection');

const cors           = require('cors');
const express        = require('express');
const app            = express();
const port           = process.env.PORT || 3000;
const passport       = require('passport');
const ConnectRoles   = require('connect-roles');
const roles          = new ConnectRoles();

app.use(passport.initialize());
app.use(roles.middleware());
app.use(cors())
app.use(express.json());

//De gebruiker ontvangt hier een register json object omdat de user nog niet bekend is
//in het systeem
app.get('/register',(req,res)=>{
    res.json({
        email:"geef hier uw email adres",
        password:"voer hier uw wachtwoord in",
        isOwner:"vul hier true in als u eigenaar bent van dit type bericht, anders false"
    })
})

//gebruiker wordt geregistreerd en ontvangt een JWT
//Daarmee is de gebruiker automatisch ingelogd
app.post('/register',(req,res)=>{
    /**
     * Wanneer een gebruiker is geregistreerd moet deze een jwt token ontvangen.
     * Geef de juiste status code terug
     */
})

//de login doet praktisch hetzelfde als de 'register' route met dat verschil dat het alleen maar
// een nieuwe JWT geeft wanneer de user al bestaat
app.post('/login',(req,res)=>{

})

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})