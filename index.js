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
db.run("CREATE TABLE IF NOT EXISTS consumer (user_id,timestamp datetime default current_timestamp,age,weight,height,gender,weightgoal,consume,activity,exercise)");

const server = express(); 
server.use(bodyParser.urlencoded({ 
    extended: true 
})); 
function getRequiredCalorie(weight, gender, height, age, activity, weightgoal){
    const properWeight = Math.round(height * height * 0.0022);
    console.log(properWeight);

    let bmr;
    if (gender == 'female'){
	bmr = Math.round(655.1 + (9.563 * weight) + (1.85 * height) - (4.676 * age));
    } else if (gender == 'male'){
	bmr = Math.round(66.5 + (13.75 * weight) + (5.003 * height) - (6.755 * age));
    }
    console.log(bmr);
    let activityFactor;
    // Activity Factor
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
    console.log(activityFactor);

    let weightgoalFactor;
    // Weight Goal
    if (weightgoal == 'Stay the same weight'){
    weightgoalFactor = 0;
    } else if (weightgoal == 'Lose 0.25 kg per week'){
	weightgoalFactor = 250;
    } else if (weightgoal == 'Lose 0.5 kg per week') {
	weightgoalFactor = 500;
    }
    console.log(weightgoalFactor);
    const requiredCalorie = Math.round((bmr * activityFactor) - weightgoalFactor);
    return requiredCalorie;
}
server.use(bodyParser.json()); 

server.get('/',(req,res)=>{
    res.sendFile(path.join(__dirname+'/home.html'));
})

server.get('/db',(req,res)=>{
    txt=[]
    db.each("SELECT * FROM consumer", function(err, row){
        txt.push(row)
    },function(){
        res.send(txt)
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
	db.get("select * from consumer where user_id=?",[user_id], function (err,row) { 
	if (err) {
	    return console.error(err.message);
	}		    
	res.json(getRequiredCalorie(row.weight,row.gender,row.height,row.age,row.activity,row.weightgoal))
	});	
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
            db.run("insert into consumer(user_id,weight) values(?,?)",[user_id,req.body.result.resolvedQuery.split(' ')[0]]);
            res.json(rsp)  	
    } 	

    if(req.body.result.action=='get-gender'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-gender"
            }
            db.run("update consumer set gender=? where user_id=?",[req.body.result.resolvedQuery.toLowerCase(),user_id])
            res.json(rsp)  	
        
    } 	

    if(req.body.result.action=='get-height'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-height"
            }
            db.run("update consumer set height=? where user_id=?",[req.body.result.resolvedQuery.split(' ')[0],user_id])
            res.json(rsp)  	
        
    } 	
    
    if(req.body.result.action=='get-age'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-age"
            }
            db.run("update consumer set age=? where user_id=?",[req.body.result.resolvedQuery.split(' ')[0],user_id])
            res.json(rsp)  	
        
    } 
	
    if(req.body.result.action=='get-activity'){
            rsp = {
                "speech":req.body.result.resolveQuery,
                 "displayText":req.body.result.resolveQuery,
                 "source":"get-activity"
            }
	    db.run("update consumer set activity=? where user_id=?",[req.body.result.resolvedQuery.toLowerCase(),user_id])
            res.json(rsp)  	
        
    } 	

    if(req.body.result.action=='get-weightgoal'){
	    function getRequiredCalorie(weight, gender, height, age, activity, weightgoal){
		    const properWeight = Math.round(height * height * 0.0022);
		    console.log(properWeight);

		    let bmr;
		    if (gender == 'female'){
			bmr = Math.round(655.1 + (9.563 * weight) + (1.85 * height) - (4.676 * age));
		    } else if (gender == 'male'){
			bmr = Math.round(66.5 + (13.75 * weight) + (5.003 * height) - (6.755 * age));
		    }
		    console.log(bmr);
		    let activityFactor;
		    // Activity Factor
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
		    console.log(activityFactor);

		    let weightgoalFactor;
		    // Weight Goal
		    if (weightgoal == 'Stay the same weight'){
		    weightgoalFactor = 0;
		    } else if (weightgoal == 'Lose 0.25 kg per week'){
			weightgoalFactor = 250;
		    } else if (weightgoal == 'Lose 0.5 kg per week') {
			weightgoalFactor = 500;
		    }
		    console.log(weightgoalFactor);
		    const requiredCalorie = Math.round((bmr * activityFactor) - weightgoalFactor);
		    return requiredCalorie;
		}
	    row={}
            db.run("update consumer set weightgoal=? where user_id=?",[req.body.result.resolvedQuery,user_id])
	    db.get("select * from consumer where user_id=?",[user_id], function (err,rows) { 
		    if (err) {
			    return console.error(err.message);
		    }		    
		    return rows?gk=getRequiredCalorie(row.weight,row.gender,row.height,row.age,row.activity,row.weightgoal):gk=100
	    });
	    rsp = {
                "speech":"You need to consume "+gk+" a day",
                 "displayText":"You need to consume "+gk+" a day",
                 "source":"get-weightgoal"
            }
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
            db.run("insert into consumer(user_id,exercise) values(?,?)",[user_id,payload[0].exercises[0].nf_calories])
            res.json(rsp)  
        }).on('error', (payload)=>{ 
            res.send(payload)  
        })
    }   
})

server.listen(PORT, () => { 
    console.log("Server is up and running..." + PORT); 
});
