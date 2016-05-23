/**
    Copyright 2014-2015 Amazon.com, Inc. or its affiliates. All Rights Reserved.

    Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

        http://aws.amazon.com/apache2.0/

    or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
*/

/**
 * This simple sample has no external dependencies or session management, and shows the most basic
 * example of how to create a Lambda function for handling Alexa Skill requests.
 *
 * Examples:
 * One-shot model:
 *  User: "Alexa, tell Greeter to say hello"
 *  Alexa: "Hello World!"
 */

/**
 * App ID for the skill
 */
var APP_ID = undefined; //replace with "amzn1.echo-sdk-ams.app.[your-unique-value-here]";

/**
 * The AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');
console.log('loaded alexa helper');
var http = require('http');
console.log('loaded http');
var Q = require('./q.js');

/**
 * Bpm is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var Bpm = function () {
    AlexaSkill.call(this, APP_ID);
};

// Request promise
var reqPromise = function reqPromise(options, body) {
  var deferral = Q.defer();
  var req = http.request(options, function(res) {
    var data;
    res.on('data', function(chunk) {
      if(chunk) {
        data = data ? data + chunk : chunk; 
      }
    });
    res.on('end', function() {
      console.log('dd', data);
      deferral.resolve(data); 
    });
    res.on('error', function() {
      console.log('response Error');
      deferral.reject(); 
    });
  });
  if(body) {
    console.log('writing body', body);
    req.write(JSON.stringify(body));
  }
  req.end();
  return deferral.promise;
};

// Extend AlexaSkill
Bpm.prototype = Object.create(AlexaSkill.prototype);
Bpm.prototype.constructor = Bpm;

Bpm.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("Bpm onSessionStarted requestId: " + sessionStartedRequest.requestId + ", sessionId: " + session.sessionId);
    // any initialization logic goes here
};

Bpm.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("Bpm onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    var speechOutput = "Welcome to the Cedrus b.p.m. interface for Alexa!"; 
    var repromptText = "Ask for help to recieve a list of things you can do.";
    response.ask(speechOutput, repromptText);
};

Bpm.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("Bpm onSessionEnded requestId: " + sessionEndedRequest.requestId + ", sessionId: " + session.sessionId);
    // any cleanup logic goes here
};

function constructTaskDescription(task) {
  var description = "";
  description += "task i.d. " ;
  description += String(task.taskId);
  description += ": ";
  description += String(task.taskSubject);
  description += ". ";
  return description;
}

Bpm.prototype.intentHandlers = {
    "GetTasksIntent": function (intent, session, response) {
    var options = {
     host: "dfdemos.market-interactive-clouds.com",
     port: "9080",
     path: "/rest/bpm/wle/v1/search/query?organization=byTask&condition=taskStatus|New_or_Received",
     method: "POST",
     headers: {
      "Authorization": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
     }
    };
    reqPromise(options).then(function(data) {
      console.log('ended data request');
      var constructedResponse = 'I found the following tasks. The first task: ';
      console.log('line 114');
      var tasksList = [];
      console.log('line 116');
      if( data instanceof Buffer ) var data = data.toString('utf-8');
      var data = JSON.parse(data);
      tasksList.push(data.data.data[0]);
      console.log('line 118');
      tasksList.push(data.data.data[1]);
      tasksList.push(data.data.data[2]);
      console.log('pushed task', tasksList);
      console.log(constructedResponse);
      var stateOptions = {
         host: "dfdemos.market-interactive-clouds.com",
         port: "3030",
         path: "/tasksList",
         method: "POST",
         headers: {
          "Content-Type": "application/json"
         }
      };
      reqPromise(stateOptions, tasksList).then(function() {
        console.log('saved tasks successfully');
        currentTask = tasksList[0];
        console.log('currentTask', currentTask);
        constructedResponse += constructTaskDescription(currentTask);
        constructedResponse += " Do you want to approve, reject or skip?";
        response.ask(constructedResponse);
      });
      return constructedResponse; 
    })
    "SkipRequestIntent": function (intent, session, response) {
      var stateOptions = {
         host: "dfdemos.market-interactive-clouds.com",
         port: "3030",
         path: "/nextTask",
         method: "GET",
      };
      reqPromise(stateOptions).then(function(data) {
        if( data instanceof Buffer ) var data = data.toString('utf-8');
        var tasks = JSON.parse(data);
        if(tasks === "Empty") {
         response.tell("You have reached the end of your tasks.");
        } else if(tasks.length === 1) {
          var constructedResponse = "You have skipped: ";
          constructedResponse += tasks[0].taskSubject;
          constructedResponse += ". You have reached the end of your tasks.";
          response.tell(constructedResponse);
        } else {
          var constructedResponse = "You have skipped: "
          constructedResponse += tasks[0].taskSubject;
          constructedResponse += ". " + constructTaskDescription(tasks[1]);
          constructedResponse += " Do you want to approve, reject or skip?";
          response.ask(constructedResponse);
        }
      });
    },
    "ApproveRequestIntent": function (intent, session, response) {
      var stateOptions = {
         host: "dfdemos.market-interactive-clouds.com",
         port: "3030",
         path: "/nextTask",
         method: "GET",
      };
      reqPromise(stateOptions).then(function(data) {
        if( data instanceof Buffer ) var data = data.toString('utf-8');
        var tasks = JSON.parse(data);
        if(tasks === "Empty") {
          response.tell("You have reached the end of your tasks.");
        } else {
          var options = {
           host: "dfdemos.market-interactive-clouds.com",
           port: "9080",
           path: "/rest/bpm/wle/v1/task/" + tasks[0].taskId + "?action=finish&decision=Approved",
           method: "PUT",
           headers: {
            "Authorization": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX" 
           }
          };
          reqPromise(options).then(function(data) {
            if(tasks.length === 1) {
              var constructedResponse = "You have approved: ";
              constructedResponse += tasks[0].taskSubject;
              constructedResponse += ". You have reached the end of your tasks.";
              response.tell(constructedResponse);
            } else {
              var constructedResponse = "You have approved: "
              constructedResponse += tasks[0].taskSubject;
              constructedResponse += ". " + constructTaskDescription(tasks[1]);
              constructedResponse += " Do you want to approve, reject or skip?";
              response.ask(constructedResponse);
            }
          });
        }
      });
    },
    "RejectRequestIntent": function (intent, session, response) {
      var stateOptions = {
         host: "dfdemos.market-interactive-clouds.com",
         port: "3030",
         path: "/nextTask",
         method: "GET",
      };
      reqPromise(stateOptions).then(function(data) {
        if( data instanceof Buffer ) var data = data.toString('utf-8');
        var tasks = JSON.parse(data);
        if(tasks === "Empty") {
          response.tell("You have reached the end of your tasks.");
        } else {
          var options = {
           host: "dfdemos.market-interactive-clouds.com",
           port: "9080",
           path: "/rest/bpm/wle/v1/task/" + tasks[0].taskId + "?action=finish&decision=Reject",
           method: "PUT",
           headers: {
            "Authorization": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX" 
           }
          };
          reqPromise(options).then(function(data) {
            if(tasks.length === 1) {
              var constructedResponse = "You have denied: ";
              constructedResponse += tasks[0].taskSubject;
              constructedResponse += ". You have reached the end of your tasks.";
              response.tell(constructedResponse);
            } else {
              var constructedResponse = "You have denied: "
              constructedResponse += tasks[0].taskSubject;
              constructedResponse += ". " + constructTaskDescription(tasks[1]);
              constructedResponse += " Do you want to approve, reject or skip?";
              response.ask(constructedResponse);
            }
          });
        }
      });
    },
    "AMAZON.HelpIntent": function (intent, session, response) {
        response.ask("You can start by asking me to list your tasks one by one, then act on them as you go through.");
    }
};

// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the Bpm skill.
    var bpm = new Bpm();
    bpm.execute(event, context);
};

