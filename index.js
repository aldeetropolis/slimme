// Create apiKey.js and export the const named API_KEY from there
const API_KEY = 'ad4538d485233756557afd8aee6f530b';
module.exports = API_KEY;

// import sqlite module
const sqlite3 = require('sqlite3');

// Create a server,  body-parser to parse incoming request bodies, 
// Make HTTP calls to an API we’ll get our data from, and API_KEY to pass as a query parameter to the database API.
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const API_KEY = require('./apiKey');

// Create an express server
const server = express();
server.use(bodyParser.urlencoded({
    extended: true
}));

server.use(bodyParser.json());

// create sqlite database project in memory
let db = new sqlite3.Database('./userdata.db', (err) => {
    if (err) {
      console.error(err.message);
    }
    // output the insert statement
    db.run("create table activity(date,user,weight,height,age,activity,food_intake,calories,weight_goal,chat)");
    console.log('Connected to the userdata database.');
});

// Output the INSERT statement
db.run(`INSERT INTO langs(name) VALUES(?)`, ['C'], function(err) {
    if (err) {
      return console.log(err.message);
    }

    console.log(`Rows inserted ${this.changes}`);
});

// Close the database connection
db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Close the database connection.');
  });


// Get Food nutrients using Nutritionix.getFoodsNutrients API

const RapidAPI = require('rapidapi-connect');
const rapid = new RapidAPI("default-application_5acdd39de4b06ec3937ba3fd", "16a6f4ee-836d-43d3-85d2-370fbebc324c");

rapid.call('Nutritionix', 'getFoodsNutrients', { 
	'applicationId': '4c64f5c3',
	'foodDescription': 'fried rice 1 cup',
	'applicationSecret': 'ad4538d485233756557afd8aee6f530b'

}).on('success', (payload)=>{
	 /*YOUR CODE GOES HERE*/ 
}).on('error', (payload)=>{
	 /*YOUR CODE GOES HERE*/ 
});

// Get Calories burned estimation using Nutritionix.getCaloriesBurnedForExercises API

const RapidAPI = require('rapidapi-connect');
const rapid = new RapidAPI("default-application_5acdd39de4b06ec3937ba3fd", "16a6f4ee-836d-43d3-85d2-370fbebc324c");

rapid.call('Nutritionix', 'getCaloriesBurnedForExercises', { 
	'exerciseDescription': 'yoga 30 minutes',
	'applicationSecret': 'ad4538d485233756557afd8aee6f530b',
	'applicationId': '4c64f5c3'

}).on('success', (payload)=>{
	 /*YOUR CODE GOES HERE*/ 
}).on('error', (payload)=>{
	 /*YOUR CODE GOES HERE*/ 
});
