/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');
//var https = require('https');

// Set up self signed ssl certificate credentials
//var fs = require('fs');
//var private_key = fs.readFileSync('sslCert/private-key.pem', 'utf-8');
//var certificate = fs.readFileSync('sslCert/certificate.pem', 'utf-8');

//var credentials = {
  //key: private_key,
  //cert: certificate
//};


// import alexa skill
var bpmHandler = require('./src/index.js');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json());

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

app.post('/alexa', function(req, res, next) {
  var body = req.body;
  console.log('/alexa body', body);
  res.set('Content-Length', '');
  var context = {
    succeed: function(data) {
      res.json(data); 
    },
    fail: function(data) {
      res.json(data); 
    },
    done: function(data) {
      res.json(data); 
    }
  }
  bpmHandler.handler(body, context);
});

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// create https server
//var httpsServer = https.createServer(credentials, app);

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
