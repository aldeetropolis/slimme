/*
 * Copyright 2018 David Fernandez <dftec.es@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/* DISABLED
const functions = require('firebase-functions'); // Cloud Functions for Firebase library
const DialogflowApp = require('actions-on-google').DialogflowApp; // Google Assistant helper library
*/

// FatSecret
const FatSecret = require('./fatsecret');
const fatAPI = new FatSecret(process.env.FS_KEY, process.env.FS_SECRET);

// Express webhook
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000
app.use( express.json() );

app.post('/', (req, res) => processWebhook( req, res ));

app.listen(PORT, () => console.log(`Listening on port ${ PORT }`));

var processWebhook = function( request, response ){
  if (request.body.result) {
    processV1Request(request, response);
  } else if (request.body.queryResult) {
    processV2Request(request, response);
  } else {
    console.log('Invalid Request');
    return response.status(400).end('Invalid Webhook Request (expecting v1 or v2 webhook request)');
  }
}

/* DISABLED
// Firebase webhook
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
  if (request.body.result) {
    processV1Request(request, response);
  } else if (request.body.queryResult) {
    processV2Request(request, response);
  } else {
    console.log('Invalid Request');
    return response.status(400).end('Invalid Webhook Request (expecting v1 or v2 webhook request)');
  }
});
*/

// db.connect();
db.any('create table if not exists consumer(id serial primary key, user_id varchar(200),timestamp timestamp,age int,weight int, height int,gender varchar(10),weightgoal varchar(100),consume int,activity varchar(100),exercise int);')
.then(data=>console.log(data))
.catch(error=>console.log(error))

const server = express(); 
server.use(bodyParser.urlencoded({ 
    extended: true 
})); 

function getRequiredCalorie(weight, gender, height, age, activity, weightgoal){
    const properWeight = Math.round(height * height * 0.0022);
    console.log('proper: '+properWeight);
    
  // BMR
    let bmr;
    if (gender == 'female'){
	bmr = Math.round(655.1 + (9.563 * weight) + (1.85 * height) - (4.676 * age));
    } else if (gender == 'male'){
	bmr = Math.round(66.5 + (13.75 * weight) + (5.003 * height) - (6.755 * age));
    }
    console.log('bmr: '+bmr);
    
    // Activity Factor
    let activityFactor;
    if (activity== 'a'){
	activityFactor = 1.2;
    } else if (activity== 'b'){
	activityFactor = 1.375;
    } else if (activity== 'c'){
	activityFactor = 1.55;
    } else if (activity== 'd'){
	activityFactor = 1.725;
    } else if (activity== 'e'){
	activityFactor = 1.9;
    }
    console.log('activ: '+activityFactor);

    let weightgoalFactor;
    // Weight Goal
    if (weightgoal == 'Stay the same weight'){
    weightgoalFactor = 0;
    } else if (weightgoal == 'Lose 0.25 kg per week'){
	weightgoalFactor = 250;
    } else if (weightgoal == 'Lose 0.5 kg per week') {
	weightgoalFactor = 500;
    }
    console.log('weightgoal: '+weightgoalFactor);
    const requiredCalorie = Math.round((bmr * activityFactor) - weightgoalFactor);
    console.log('req calorie: '+requiredCalorie)
    return requiredCalorie;
}
server.use(bodyParser.json()); 

server.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname+'/home.html'));
})

server.get('/db',(req,res)=>{
    txt=[]
    db.any('select * from consumer')
    .then(data => {
        res.json(data);
    })
    .catch(error => {
        res.send(error)
    })
})

server.get('/insert',(req,res)=>{
    txt=[]
    db.any("insert into consumer(user_id,timestamp,age,gender,weight,height,weightgoal,activity) values('test',now(),'44','female','64','164','Stay the same weight','a')")
    .then(data => {
        res.json(data);
    })
    .catch(error => {
        res.send(error)
    })
})

server.get('/about',(req,res)=>{
	res.sendFile(path.join(__dirname + '/about.html'));
})

server.get('/user-profile',(req,res)=>{
	res.sendFile(path.join(__dirname + '/user-profile.html'));
})

server.get('/track-calorie',(req,res)=>{
	res.sendFile(path.join(__dirname + '/track-calorie.html'));
})

server.get('/getreq',(req,res)=>{
	user_id=req.query.user_id
    db.any("select * from consumer where user_id=$1 AND weight>0 AND height>0 AND age>0",[user_id])
    .then(data=>res.json(getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal'])))
    .catch(error=>res.json(error))
})

server.get('/getdaily',(req,res)=>{
	user_id=req.query.user_id
    req=0;
    db.any("select * from consumer where user_id=$1 AND weight>0 AND height>0 AND age>0",[user_id])
    .then(data=>{
        req=getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal'])
    })
    .catch(err=>console.log(err))  	        
    db.any("select sum(consume) as cons,sum(exercise) as exc from consumer where user_id=$1 and date(timestamp)=date(now())",[user_id])
    .then(data=>{
        rem = parseFloat(req)-parseFloat(data[0]['cons'])+parseFloat(data[0]['exc'])
        res.json({
            "speech":"Your daily calorie "+req+" k-calories. Intake "+data[0]['cons']+" kCal. Burned "+data[0]['exc']+". Remaining is "+rem,
            "displayText":"Your daily calorie "+req+" k-calories. Intake "+data[0]['cons']+" kCal. Burned "+data[0]['exc']+". Remaining is "+rem,
            "source":"daily-calorie"
        })
    })
    .catch(err=>console.log(err))
})

server.get('/get-calorie',(req,res)=>{
	rapid.call('Nutritionix', 'getFoodsNutrients', { 
	 'applicationId': '4c64f5c3',
	 'foodDescription': req.query.what,
	 'applicationSecret': 'ad4538d485233756557afd8aee6f530b'
	}).on('success', (payload)=>{ 
	 res.json(payload[0].foods[0].nf_calories);  
	}).on('error', (payload)=>{
	 res.send(payload); 
	});
})

server.get('/get-burncalorie',(req,res)=>{
	rapid.call('Nutritionix', 'getCaloriesBurnedForExercises', { 
        'exerciseDescription': req.query.what, 
        'applicationSecret': 'ad4538d485233756557afd8aee6f530b', 
        'applicationId': '4c64f5c3' 
	}).on('success', (payload)=>{ 
	 res.json(payload[0]);  
	}).on('error', (payload)=>{
	 res.send(payload); 
	});
})

server.post('/',(req,res)=>{
    var user_id = req.body.originalRequest.data.source.userId;

    if(req.body.result.action=='get-weight'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-weight"
            }
            db.any("insert into consumer(user_id,timestamp,weight) values($1,now(),$2)",[user_id,req.body.result.resolvedQuery.split(' ')[0]])
            .then(res=>console.log(res))
            .catch(err=>console.log(err))
            res.json(rsp)  	
    } 	

    if(req.body.result.action=='get-gender'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-gender"
            }
            db.any("update consumer set gender=$1 where user_id=$2",[req.body.result.resolvedQuery.toLowerCase(),user_id])
            .then(res=>console.log(res))
            .catch(err=>console.log(err))
            res.json(rsp)  	
    } 	

    if(req.body.result.action=='get-height'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-height"
            }
            db.any("update consumer set height=$1 where user_id=$2",[req.body.result.resolvedQuery.split(' ')[0],user_id])
            .then(res=>console.log(res))
            .catch(err=>console.log(err))
            res.json(rsp)  	
    } 	
    
    if(req.body.result.action=='get-age'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-age"
            }
            db.any("update consumer set age=$1 where user_id=$2",[req.body.result.resolvedQuery.split(' ')[0],user_id])
            .then(res=>console.log(res))
            .catch(err=>console.log(err))
            res.json(rsp)  	        
    } 
	
    if(req.body.result.action=='get-activity'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-activity"
            }
        db.any("update consumer set activity=$1 where user_id=$2",[req.body.result.resolvedQuery.toLowerCase(),user_id])
        .then(res=>console.log(res))
        .catch(err=>console.log(err))
        res.json(rsp)  	
    } 	

    if(req.body.result.action=='get-weightgoal'){
        db.any("update consumer set weightgoal=$1 where user_id=$2",[req.body.result.resolvedQuery,user_id])
        .then(res=>console.log(res))
        .catch(err=>console.log(err))
        db.any("select * from consumer where user_id=$1 order by timestamp desc limit 1",[user_id])
        .then(data=>{
            rsp = {
                "speech":"In order to reach your weight goal, you would have to consume "+getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal'])+" kcal a day, Do you want to start your diet today?",
                "displayText":"In order to reach your weight goal, you would have to consume "+getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal'])+" kcal a day, Do you want to start your diet today?",
                "source":"get-weightgoal"
            };
            res.json(rsp)
        })
        .catch(err=>console.log(err))        
    }

    if(req.body.result.action=='daily-calorie'){
        req=0;
        db.any("select * from consumer where user_id=$1 AND weight>0 AND height>0 AND age>0",[user_id])
        .then(data=>{
            req=getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal'])
        })
        .catch(err=>console.log(err))  	        
        db.any("select sum(consume) as cons,sum(exercise) as exc from consumer where user_id=$1 and date(timestamp)=date(now())",[user_id])
        .then(data=>{
            rem = parseFloat(req)-parseFloat(data[0]['cons'])+parseFloat(data[0]['exc'])
            rsp = {
                "speech":"Your daily calorie needs is "+req+" k-calories. Intake "+data[0]['cons']+" kCal. Burned is "+data[0]['exc']+" kCal. Remaining is "+rem+" kCal.",
                "displayText":"Your daily calorie needs is "+req+" k-calories. Intake "+data[0]['cons']+" kCal. Burned is "+data[0]['exc']+" kCal. Remaining is "+rem+" kCal.",
                "source":"daily-calorie"
            }
        })
        .catch(err=>console.log(err))
        res.json(rsp)
    }	
	
/*
* Function to handle v1 webhook requests from Dialogflow
*/
/*
function processV1Request (request, response) {
  let action = request.body.result.action; // https://dialogflow.com/docs/actions-and-parameters
  let parameters = request.body.result.parameters; // https://dialogflow.com/docs/actions-and-parameters
  let inputContexts = request.body.result.contexts; // https://dialogflow.com/docs/contexts
  let requestSource = (request.body.originalRequest) ? request.body.originalRequest.source : undefined;
  const googleAssistantRequest = 'google'; // Constant to identify Google Assistant requests
/* DISABLED
  const app = new DialogflowApp({request: request, response: response});
*/
  // Create handlers for Dialogflow actions as well as a 'default' handler
/*
  const actionHandlers = {
    // IMC intent has been matched, calculate imc with the parameters
    'bmi_action': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        sendGoogleResponse('Hello, Welcome to my Dialogflow agent!'); // Send response to user
      } else {
        const height = request.body.result.parameters.height;
        const weight = request.body.result.parameters.weight;
        const bmi = ((100 * 100 * weight) / (height * height)).toFixed(2);

        sendResponse('If your weight is ' + weight + ' kg and height is ' + height + ' cm, your BMI is ' + bmi + '.'); // Send response to user
      }
    },
    */

    // Food intent has been matched, call Fatsecret API
    'food_action': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        sendGoogleResponse('Hello, Welcome to my Dialogflow agent!'); // Send response to user
      } else {
        // FatSecret test
        const food = request.body.result.parameters.food;
        var result_id = 14102545;
        var result_name = 'no';
        var result_data = 'unknown';

        fatAPI
          .method('foods.search', {
            format: 'json',
            search_expression: food,
            max_results: 1
          })
          .then(function(results) {
            console.log(results.foods.food);
            result_id = results.foods.food.food_id;
            result_name = results.foods.food.food_name;
            result_data = results.foods.food.food_description;

            sendResponse('Search: ' + food + '. Found: ' + result_name + '. ' + result_data ); // Send response to user
/*
            fatAPI
            .method('food.get', {
              format: 'json',
              food_id: result_id
            })
            .then(function(result) {
              console.log(result.food);
              result_name = result.food.food_name;
              result_data = result.food.servings.serving.calories;
              sendResponse('Buscando: ' + food + '. Encontrado: ' + result_name + '. ' + result_data ); // Send response to user
            });

*/
          })
          .catch(err => console.error(err));


      }
    },
    // The default welcome intent has been matched, welcome the user (https://dialogflow.com/docs/events#default_welcome_intent)
    'input.welcome': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        sendGoogleResponse('Hello, Welcome to my Dialogflow agent!'); // Send simple response to user
      } else {
        sendResponse('Hello, Welcome to my Dialogflow agent!'); // Send simple response to user
      }
    },
    // The default fallback intent has been matched, try to recover (https://dialogflow.com/docs/intents#fallback_intents)
    'input.unknown': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        sendGoogleResponse('I\'m having trouble, can you try that again?'); // Send simple response to user
      } else {
        sendResponse('I\'m having trouble, can you try that again?'); // Send simple response to user
      }
    },
    // Default handler for unknown or undefined actions
    'default': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        let responseToUser = {
          //googleRichResponse: googleRichResponse, // Optional, uncomment to enable
          //googleOutputContexts: ['weather', 2, { ['city']: 'rome' }], // Optional, uncomment to enable
          speech: 'This message is from Dialogflow\'s Cloud Functions for Firebase editor!', // spoken response
          text: 'This is from Dialogflow\'s Cloud Functions for Firebase editor! :-)' // displayed response
        };
        sendGoogleResponse(responseToUser);
      } else {
        let responseToUser = {
          //data: richResponsesV1, // Optional, uncomment to enable
          //outputContexts: [{'name': 'weather', 'lifespan': 2, 'parameters': {'city': 'Rome'}}], // Optional, uncomment to enable
          speech: 'This message is from Dialogflow\'s Cloud Functions for Firebase editor!', // spoken response
          text: 'This is from Dialogflow\'s Cloud Functions for Firebase editor! :-)' // displayed response
        };
        sendResponse(responseToUser);
      }
    }
  };
  // If undefined or unknown action use the default handler
  if (!actionHandlers[action]) {
    action = 'default';
  }
  // Run the proper handler function to handle the request from Dialogflow
  actionHandlers[action]();
    // Function to send correctly formatted Google Assistant responses to Dialogflow which are then sent to the user
  function sendGoogleResponse (responseToUser) {
    /* DISABLED
    if (typeof responseToUser === 'string') {
      app.ask(responseToUser); // Google Assistant response
    } else {
      // If speech or displayText is defined use it to respond
      let googleResponse = app.buildRichResponse().addSimpleResponse({
        speech: responseToUser.speech || responseToUser.displayText,
        displayText: responseToUser.displayText || responseToUser.speech
      });
      // Optional: Overwrite previous response with rich response
      if (responseToUser.googleRichResponse) {
        googleResponse = responseToUser.googleRichResponse;
      }
      // Optional: add contexts (https://dialogflow.com/docs/contexts)
      if (responseToUser.googleOutputContexts) {
        app.setContext(...responseToUser.googleOutputContexts);
      }
      console.log('Response to Dialogflow (AoG): ' + JSON.stringify(googleResponse));
      app.ask(googleResponse); // Send response to Dialogflow and Google Assistant
    }
    */
  }
  // Function to send correctly formatted responses to Dialogflow which are then sent to the user
  function sendResponse (responseToUser) {
    // if the response is a string send it as a response to the user
    if (typeof responseToUser === 'string') {
      let responseJson = {};
      responseJson.speech = responseToUser; // spoken response
      responseJson.displayText = responseToUser; // displayed response
      response.json(responseJson); // Send response to Dialogflow
    } else {
      // If the response to the user includes rich responses or contexts send them to Dialogflow
      let responseJson = {};
      // If speech or displayText is defined, use it to respond (if one isn't defined use the other's value)
      responseJson.speech = responseToUser.speech || responseToUser.displayText;
      responseJson.displayText = responseToUser.displayText || responseToUser.speech;
      // Optional: add rich messages for integrations (https://dialogflow.com/docs/rich-messages)
      responseJson.data = responseToUser.data;
      // Optional: add contexts (https://dialogflow.com/docs/contexts)
      responseJson.contextOut = responseToUser.outputContexts;
      console.log('Response to Dialogflow: ' + JSON.stringify(responseJson));
      response.json(responseJson); // Send response to Dialogflow
    }
  }
}
/* DISABLED
// Construct rich response for Google Assistant (v1 requests only)
const app = new DialogflowApp();
const googleRichResponse = app.buildRichResponse()
  .addSimpleResponse('This is the first simple response for Google Assistant')
  .addSuggestions(
    ['Suggestion Chip', 'Another Suggestion Chip'])
    // Create a basic card and add it to the rich response
  .addBasicCard(app.buildBasicCard(`This is a basic card.  Text in a
 basic card can include "quotes" and most other unicode characters
 including emoji 📱.  Basic cards also support some markdown
 formatting like *emphasis* or _italics_, **strong** or __bold__,
 and ***bold itallic*** or ___strong emphasis___ as well as other things
 like line  \nbreaks`) // Note the two spaces before '\n' required for a
                        // line break to be rendered in the card
    .setSubtitle('This is a subtitle')
    .setTitle('Title: this is a title')
    .addButton('This is a button', 'https://assistant.google.com/')
    .setImage('https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
      'Image alternate text'))
  .addSimpleResponse({ speech: 'This is another simple response',
    displayText: 'This is the another simple response 💁' });

// Rich responses for Slack and Facebook for v1 webhook requests
const richResponsesV1 = {
  'slack': {
    'text': 'This is a text response for Slack.',
    'attachments': [
      {
        'title': 'Title: this is a title',
        'title_link': 'https://assistant.google.com/',
        'text': 'This is an attachment.  Text in attachments can include \'quotes\' and most other unicode characters including emoji 📱.  Attachments also upport line\nbreaks.',
        'image_url': 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
        'fallback': 'This is a fallback.'
      }
    ]
  },
  'facebook': {
    'attachment': {
      'type': 'template',
      'payload': {
        'template_type': 'generic',
        'elements': [
          {
            'title': 'Title: this is a title',
            'image_url': 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
            'subtitle': 'This is a subtitle',
            'default_action': {
              'type': 'web_url',
              'url': 'https://assistant.google.com/'
            },
            'buttons': [
              {
                'type': 'web_url',
                'url': 'https://assistant.google.com/',
                'title': 'This is a button'
              }
            ]
          }
        ]
      }
    }
  }
};
*/

/*
* Function to handle v2 webhook requests from Dialogflow
*/
function processV2Request (request, response) {
  // An action is a string used to identify what needs to be done in fulfillment
  let action = (request.body.queryResult.action) ? request.body.queryResult.action : 'default';
  // Parameters are any entites that Dialogflow has extracted from the request.
  let parameters = request.body.queryResult.parameters || {}; // https://dialogflow.com/docs/actions-and-parameters
  // Contexts are objects used to track and store conversation state
  let inputContexts = request.body.queryResult.contexts; // https://dialogflow.com/docs/contexts
  // Get the request source (Google Assistant, Slack, API, etc)
  let requestSource = (request.body.originalDetectIntentRequest) ? request.body.originalDetectIntentRequest.source : undefined;
  // Get the session ID to differentiate calls from different users
  let session = (request.body.session) ? request.body.session : undefined;
  // Create handlers for Dialogflow actions as well as a 'default' handler
  const actionHandlers = {

    // IMC intent has been matched, calculate imc with the parameters
    'bmi_action': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        sendGoogleResponse('Hello, Welcome to my Dialogflow agent!'); // Send response to user
      } else {
        const height = request.body.result.parameters.height;
        const weight = request.body.result.parameters.weight;
        const imc = ((100 * 100 * weight) / (height * height)).toFixed(2);

        sendResponse('Si pesas ' + weight + ' kilos y mides ' + height + ' centímetros, tu indice de masa corporal es ' + imc + '.'); // Send response to user
      }
    },
    // Food intent has been matched, call Fatsecret API
    'food_action': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      if (requestSource === googleAssistantRequest) {
        sendGoogleResponse('Hello, Welcome to my Dialogflow agent!'); // Send response to user
      } else {
        // FatSecret test
        const food = request.body.result.parameters.food;
        var result_id = 14102545;
        var result_name = 'no';
        var result_data = 'desconocido';

        fatAPI
          .method('foods.search', {
            format: 'json',
            search_expression: food,
            max_results: 1
          })
          .then(function(results) {
            console.log(results.foods.food);
            result_id = results.foods.food.food_id;
            result_name = results.foods.food.food_name;
            result_data = results.foods.food.food_description;

            sendResponse('Buscando: ' + food + '. Encontrado: ' + result_name + '. ' + result_data ); // Send response to user
/*
            fatAPI
            .method('food.get', {
              format: 'json',
              food_id: result_id
            })
            .then(function(result) {
              console.log(result.food);
              result_name = result.food.food_name;
              result_data = result.food.servings.serving.calories;
              sendResponse('Buscando: ' + food + '. Encontrado: ' + result_name + '. ' + result_data ); // Send response to user
            });
*/
          })
          .catch(err => console.error(err));

      }
    },

    // The default welcome intent has been matched, welcome the user (https://dialogflow.com/docs/events#default_welcome_intent)
    'input.welcome': () => {
      sendResponse('Hello, Welcome to my Dialogflow agent!'); // Send simple response to user
    },
    // The default fallback intent has been matched, try to recover (https://dialogflow.com/docs/intents#fallback_intents)
    'input.unknown': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      sendResponse('I\'m having trouble, can you try that again?'); // Send simple response to user
    },
    // Default handler for unknown or undefined actions
    'default': () => {
      let responseToUser = {
        //fulfillmentMessages: richResponsesV2, // Optional, uncomment to enable
        //outputContexts: [{ 'name': `${session}/contexts/weather`, 'lifespanCount': 2, 'parameters': {'city': 'Rome'} }], // Optional, uncomment to enable
        fulfillmentText: 'This is from Dialogflow\'s Cloud Functions for Firebase editor! :-)' // displayed response
      };
      sendResponse(responseToUser);
    }
  };
  // If undefined or unknown action use the default handler
  if (!actionHandlers[action]) {
    action = 'default';
  }
  // Run the proper handler function to handle the request from Dialogflow
  actionHandlers[action]();
  // Function to send correctly formatted responses to Dialogflow which are then sent to the user
  function sendResponse (responseToUser) {
    // if the response is a string send it as a response to the user
    if (typeof responseToUser === 'string') {
      let responseJson = {fulfillmentText: responseToUser}; // displayed response
      response.json(responseJson); // Send response to Dialogflow
    } else {
      // If the response to the user includes rich responses or contexts send them to Dialogflow
      let responseJson = {};
      // Define the text response
      responseJson.fulfillmentText = responseToUser.fulfillmentText;
      // Optional: add rich messages for integrations (https://dialogflow.com/docs/rich-messages)
      if (responseToUser.fulfillmentMessages) {
        responseJson.fulfillmentMessages = responseToUser.fulfillmentMessages;
      }
      // Optional: add contexts (https://dialogflow.com/docs/contexts)
      if (responseToUser.outputContexts) {
        responseJson.outputContexts = responseToUser.outputContexts;
      }
      // Send the response to Dialogflow
      console.log('Response to Dialogflow: ' + JSON.stringify(responseJson));
      response.json(responseJson);
    }
  }
}

/* DISABLED
const richResponseV2Card = {
  'title': 'Title: this is a title',
  'subtitle': 'This is an subtitle.  Text can include unicode characters including emoji 📱.',
  'imageUri': 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
  'buttons': [
    {
      'text': 'This is a button',
      'postback': 'https://assistant.google.com/'
    }
  ]
};
const richResponsesV2 = [
  {
    'platform': 'ACTIONS_ON_GOOGLE',
    'simple_responses': {
      'simple_responses': [
        {
          'text_to_speech': 'Spoken simple response',
          'display_text': 'Displayed simple response'
        }
      ]
    }
  },
  {
    'platform': 'ACTIONS_ON_GOOGLE',
    'basic_card': {
      'title': 'Title: this is a title',
      'subtitle': 'This is an subtitle.',
      'formatted_text': 'Body text can include unicode characters including emoji 📱.',
      'image': {
        'image_uri': 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png'
      },
      'buttons': [
        {
          'title': 'This is a button',
          'open_uri_action': {
            'uri': 'https://assistant.google.com/'
          }
        }
      ]
    }
  },
  {
    'platform': 'FACEBOOK',
    'card': richResponseV2Card
  },
  {
    'platform' : 'LINE',
      "line": {
    "type": "template",
    "altText": "This is a buttons template",
    "template": {
      "type": "buttons",
      "thumbnailImageUrl": "https://media.giphy.com/media/A5F11Cbo7b8cw/giphy.gif",
      "imageAspectRatio": "rectangle",
      "imageSize": "cover",
      "imageBackgroundColor": "#FFFFFF",
      "title": "I am SlimMe",
      "text": "Your virtual diet assistant",
      "actions": [
        {
          "type": "message",
          "label": "Okay",
          "text": "Okay"
        }
      ]
    }
  },
  },
  {
    'platform': 'SLACK',
    'card': richResponseV2Card
  }
];
*/
