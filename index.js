const express = require('express'); 
const bodyParser = require('body-parser'); 
const http = require('http'); 
const API_KEY = require('./apiKey'); 
const PORT = process.env.PORT || 5000 
const path = require('path');

const RapidAPI = require('rapidapi-connect');
const rapid = new RapidAPI("default-application_5acdd39de4b06ec3937ba3fd","16a6f4ee-836d-43d3-85d2-370fbebc324c");

const sqlite = require('sqlite3').verbose();
const db = new sqlite.Database('slimme.db');
db.run("CREATE TABLE IF NOT EXISTS consumer (user_id,timestamp datetime default current_timestamp,age,weight,height,gender,weight_goal,consume,activity)");

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

server.get('/user-profile',(req,res)=>{
	res.sendFile(path.join(__dirname + '/user-profile.html'));
})

server.get('/track-calorie',(req,res)=>{
	res.sendFile(path.join(__dirname + '/track-calorie.html'));
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

    if(req.body.result.action=='get-goal'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-goal"
            }
            res.json(rsp)  	
        
    } 

    if(req.body.result.action=='get-weight'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-weight"
            }
            db.run("insert into consumer(user_id,weight) values(?,?)",[user_id,req.body.result.resolvedQuery]);
            res.json(rsp)  	
    } 	

    if(req.body.result.action=='get-gender'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-gender"
            }
            db.run("update consumer set gender=? where user_id=?",[req.body.result.resolveQuery,user_id])
            res.json(rsp)  	
        
    } 	

    if(req.body.result.action=='get-height'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-height"
            }
            db.run("update consumer set height=? where user_id=?",[req.body.result.resolveQuery,user_id])
            res.json(rsp)  	
        
    } 	

    if(req.body.result.action=='get-weightgoal'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-weightgoal"
            }
            db.run("update consumer set weight_goal=? where user_id=?",[req.body.result.resolveQuery,user_id])
            res.json(rsp)  	
        
    } 	
	
    if(req.body.result.action=='get-calorie'){
        //db.run("insert into consumer(user_id) values(?)"+user_id);
        rapid.call('Nutritionix', 'getFoodsNutrients', { 
            'applicationId': '4c64f5c3',
            'foodDescription': req.body.result.resolvedQuery,
            'applicationSecret': 'ad4538d485233756557afd8aee6f530b'
        }).on('success', (payload)=>{ 
	    rsp = {
                "speech":"You consume "+payload[0].foods[0].nf_calories+" k-calories.",
                 "displayText":"You consume "+payload[0].foods[0].nf_calories+" k-calories.",
                 "source":"get-calorie"
            }
            db.run("insert into consumer(user_id,consume) values(?,?)",[user_id,payload[0].foods[0].nf_calories])
            res.json(rsp)  	
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
                "speech":"Yay! You just burn "+payload[0].exercises[0].nf_calories+" k-calories. Keep it up!",
                 "displayText":"Yay! You just burn "+payload[0].exercises[0].nf_calories+" k-calories. Keep it up!",
                 "source":"burn-calorie"
            }
            db.run("insert into consumer(user_id,activity) values(?,?)",[user_id,payload[0].exercises[0].nf_calories])
            res.json(rsp)  
        }).on('error', (payload)=>{ 
            res.send(payload)  
        })
    }         
})

server.listen(PORT, () => { 
    console.log("Server is up and running..." + PORT); 
});
