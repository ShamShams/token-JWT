const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

const config = require('./config');
const User = require('./app/model/user')

const app = express();


const port = process.env.PORT || config.port;
mongoose.connect(config.database);
app.set('superSecret', config.secret); // indique le secret à express pour qu'il l'utilise

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('dev'));

// Création d'un fake user
app.get('/setup', (req, res) => {
  let newUser = new User({
    name: 'shamshams',
    password: 'mot2passe',
    admin: true
  });

  // Sauvegarder le user
  newUser.save((err) => {
    if (err) throw err;
    console.log('User saved successfully');
    res.json({ success: true });
  });
});

// ____________ ROUTES API ____________
const apiRoutes = express.Router();


apiRoutes.use((req, res, next) => {
  // Check header or url parameters or post parameters for token
  let token = req.body.token || req.query.token || req.headers['x-access-token'];

  // Decode token
  if (token) {
    // Verifiy secret and checks express
    jwt.verify(token, app.get('superSecret'), (err, decoded) => {
      if (err) {
        return res.json({ success: false, message: 'Failed to auth token' });
      } else {
        // if everything is good, save to request for use in other routes ???
        req.decoded = decoded;
        next();
      }
    });
  } else {
    // if there is no token,
    // return an error
    return res.status(403).send({
      success: false,
      message: 'No token provided'
    });
  }
});

// GET http://localhost:3006/api/
apiRoutes.get('/', (req, res) => {
  res.json({ message: 'Welcome! Are you ready? Let\'s learn authentification!' })
});

// GET http://localhost:3006/api/users
apiRoutes.get('/users', (req, res) => {
  User.find({}, (err, users) => {
    res.json(users);
  });
});

apiRoutes.post('/authenticate', (req, res) => {
  // Find the users
  User.findOne({
    name: req.body.name
  }, (err, user) => {
    if (err) throw err;
    if (!user) {
      res.json({ success: false, message: 'Authentification failed, User not found.' });
    } else if (user) {
      if (user.password != req.body.password) {
        res.json({ success: false, message: 'Authentication failed, bad password.'});
      } else {
        const payload = {
          admin: user.admin
        };
        // On créé le token au moment de l'authenticate
        let token = jwt.sign(payload, app.get('superSecret'), {
          expiresIn : 60*60*24 // expires in 24 hours
        });
        // superSecret : pwd du site caché dans le token. Seul celui qui a généré le site le connait.
        res.json({
          success: true,
          message: 'Enjoy your token',
          token: token
        });
      }
    }
  });
});

app.use('/api', apiRoutes);

app.listen(config.port, () => {
  console.log(`Connected. The API is at http://localhost:${config.port}/api`);
});
