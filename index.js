const express = require('express'); 
const bodyParser = require('body-parser'); 
const http = require('http'); 
const API_KEY = require('./apiKey'); 
const PORT = process.env.PORT || 5000 
const path = require('path');

const RapidAPI = require('rapidapi-connect');
const rapid = new RapidAPI("default-application_5acdd39de4b06ec3937ba3fd","16a6f4ee-836d-43d3-85d2-370fbebc324c");

const server = express(); 
server.use(bodyParser.urlencoded({ 
    extended: true 
})); 

server.use(bodyParser.json()); 

server.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname+'/home.html'));
})

server.get('/about',(req,res)=>{
	res.sendFile(path.join(__dirname + '/about.html'));
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
    if(req.body.result.action=='get-calorie'){
        rapid.call('Nutritionix', 'getFoodsNutrients', { 
            'applicationId': '4c64f5c3',
            'foodDescription': req.body.result.parameters.what,
            'applicationSecret': 'ad4538d485233756557afd8aee6f530b'
        }).on('success', (payload)=>{ 
            res.json(payload[0]);  
        }).on('error', (payload)=>{
            res.send(payload); 
        });
    } 

    if(req.body.result.action=='burn-calorie'){
        rapid.call('Nutritionix', 'getCaloriesBurnedForExercises', {  
            'exerciseDescription': req.body.result.resolvedQuery, 
            'applicationSecret': 'ad4538d485233756557afd8aee6f530b', 
            'applicationId': '4c64f5c3' 
        }).on('success', (payload)=>{ 
            rsp = {
                "speech":"You just burn "+payload[0].exercises[0].nf_calories+" calories",
                 "displayText":"Yay! You just burn "+payload[0].exercises[0].nf_calories+" k-calories. Keep it up!",
                 "source":"burn-calorie"
            }
            res.json(rsp)  
        }).on('error', (payload)=>{ 
            res.send(payload)  
        })
    }         
})

server.listen(PORT, () => { 
    console.log("Server is up and running..." + PORT); 
});
