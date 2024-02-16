import cors from 'cors';
import express from 'express';
import passport from 'passport';
import connectToDatabase from "./database/mongooseConnection";

const app = express();
const port: number = process.env.PORT ? parseInt(process.env.PORT) : 3000;

connectToDatabase();

app.use(passport.initialize());
app.use(cors())
app.use(express.json());

//De gebruiker ontvangt hier een register json object omdat de user nog niet bekend is
//in het systeem
app.get('/register', (req, res) => {
    res.json({
        email: "geef hier uw email adres",
        password: "voer hier uw wachtwoord in",
        isOwner: "vul hier true in als u eigenaar bent van dit type bericht, anders false"
    })
})

//gebruiker wordt geregistreerd en ontvangt een JWT
//Daarmee is de gebruiker automatisch ingelogd
app.post('/register', (req, res) => {
    /**
     * Wanneer een gebruiker is geregistreerd moet deze een jwt token ontvangen.
     * Geef de juiste status code terug
     */
})

//de login doet praktisch hetzelfde als de 'register' route met dat verschil dat het alleen maar
// een nieuwe JWT geeft wanneer de user al bestaat
app.post('/login', (req, res) => {

})

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})