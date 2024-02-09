const cors           = require('cors');
const express        = require('express');
const app            = express();
const port           = process.env.APIGATEWAYPORT || 3000;
const passport       = require('passport');
const ConnectRoles   = require('connect-roles');
const authService    = new AuthService();
const roles          = new ConnectRoles();
const CircuitBreaker = require('opossum');
const postService = new PostService();


app.use(passport.initialize());
app.use(roles.middleware());
app.use(cors())
app.use(express.json());




roles.use('grant',req => {
  if (req.user && roles.isAuthenticated()){
    return req.user.isOwner === true;
  }
})

//Een route waar authorisatie op zit
app.get('/posts',passport.authenticate('jwt',{session:false}),
roles.can('grant'),(req,res)=>{

    postService.getPosts().then((posts)=>{
        res.send(posts);
    }).catch((e)=>{
        res.status(400).send(e);
    })
    /*inmiddels weten we hier dat de user bekend is in het systeem
     *Nu moet er gekeken worden of deze user deze route mag aanroepen
     *Wanneer dat het geval is mag bijv. de **circuitBreaker.fire()** methode aangeroepen 
     *worden die vervolgens het endpoint aanroept van de microservice.
     *Om de enpoint van de postService microservice aan te roepen, kun je bijv. axios gebruiken
    */
    res.send('welkom')
  })

app.listen(port, () => {
    console.log('Server is up on port ' + port);
})