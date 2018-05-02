// import sqlite module 
const sqlite3 = require('sqlite3'); 

// Create a server,  body-parser to parse incoming request bodies,  
// Make HTTP calls to an API we’ll get our data from, and API_KEY to pass as a query parameter to the database API. 
const express = require('express'); 
const bodyParser = require('body-parser'); 
const http = require('http'); 
const API_KEY = require('./apiKey'); 
const PORT = process.env.PORT || 5000 
const path = require('path');

// Create an express server 
const server = express(); 
server.use(bodyParser.urlencoded({ 
    extended: true 
})); 

server.use(bodyParser.json()); 

// create sqlite database project in memory 
/* 
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

*/ 
/*server.get('/',(req,res)=>{ 
    res.send(req); 
}); 
*/ 
server.get('/about',(req,res)=>{
	res.sendFile(path.join(__dirname + '/about.html'));
})
	   
const RapidAPI = require('rapidapi-connect');
const rapid = new RapidAPI("default-application_5acdd39de4b06ec3937ba3fd", "16a6f4ee-836d-43d3-85d2-370fbebc324c");
server.post('/get-calorie',(req,res)=>{
	console.log(req.body.what)
	rapid.call('Nutritionix', 'getFoodsNutrients', { 
	 'applicationId': '4c64f5c3',
	 'foodDescription': req.body.what,
	 'applicationSecret': 'ad4538d485233756557afd8aee6f530b'
	}).on('success', (payload)=>{ 
	 res.send(payload[0]);  
	}).on('error', (payload)=>{
	 res.send(payload); 
	});
 })

/*server.get('/get-burncalorie', (req, res) => { 

    // Get Calories burned estimation using Nutritionix.getCaloriesBurnedForExercises API 
     
    rapid.call('Nutritionix', 'getCaloriesBurnedForExercises', {  
     'exerciseDescription': 'yoga 30 minutes', 
     'applicationSecret': 'ad4538d485233756557afd8aee6f530b', 
     'applicationId': '4c64f5c3' 

    }).on('success', (payload)=>{ 
     res.send(payload[0])  
    }).on('error', (payload)=>{ 
        console.log(payload)  
    }); 
}); 
*/ 

server.listen(PORT, () => { 
    console.log("Server is up and running..." + PORT); 
});
