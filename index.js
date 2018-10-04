const express = require('express'); 
const bodyParser = require('body-parser'); 
const http = require('http'); 
const API_KEY = require('./apiKey'); 
const PORT = process.env.PORT || 5000 
const path = require('path');
const promise = require('bluebird'); 
const initOptions = {
    promiseLib: promise // overriding the default (ES6 Promise);
};
// const RapidAPI = require('rapidapi-connect');
// const rapid = new RapidAPI("default-application_5acdd39de4b06ec3937ba3fd","16a6f4ee-836d-43d3-85d2-370fbebc324c");
const FatSecret = require('./fatsecret');
const fatAPI = new FatSecret(process.env.FS_KEY, process.env.FS_SECRET);
const pgp = require('pg-promise')(initOptions);
pgp.pg.defaults.ssl = true;
const db = pgp(process.env.DATABASE_URL);

db.any('create table if not exists consumer(id serial primary key, user_id varchar(200),timestamp timestamp,age int,weight int, height int,gender varchar(10),weightgoal varchar(100),consume int,activity varchar(100),exercise int);')
.then(data=>console.log(data))
.catch(error=>console.log(error))

const server = express(); 
server.use(bodyParser.urlencoded({extended: true })); 

function getRequiredCalorie(weight, gender, height, age, activity, weightgoal){
    const properWeight = Math.round(height * height * 0.0022);
    console.log('proper: '+properWeight);

    let bmr;
    if (gender == 'female'){
	bmr = Math.round(655.1 + (9.563 * weight) + (1.85 * height) - (4.676 * age));
    } else if (gender == 'male'){
	bmr = Math.round(66.5 + (13.75 * weight) + (5.003 * height) - (6.755 * age));
    }
    console.log('bmr: '+bmr);
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

server.get('/get-food',(req,res)=>{
    const food = req.query.food;

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
        //res.send('Search: '+food +'. Found: '+ result_name + '. ' + result_data);
	fatAPI
            .method('food.get', {
              format: 'json',
              food_id: result_id
            })
            .then(function(result) {
              console.log(result.food);
              result_name = result.food.food_name;
              result_data = JSON.stringify(result.food.servings.serving[0].calories);
	      result_data2 = JSON.stringify(result.food.servings.serving[0].carbohydrate);
	      result_data3 = JSON.stringify(result.food.servings.serving[0].protein);
	      result_data4 = JSON.stringify(result.food.servings.serving[0].fat);
              res.send('Result: ' + food + '. Food: ' + result_name + '. Calories: ' + result_data + '. Carbohydrate (gr): ' + result_data2 + '. Protein (gr): ' + result_data3 + '. Fat (gr): ' + result_data4 + '. Size: 1 '+result.food.servings.serving[0].measurement_description); // Send response to user
            });
    })
})

server.get('/get-exercise',(req,res)=>{
    const exercise = req.query.exercise;

    fatAPI
    .method('exercises.get', {
        format: 'json',
        search_expression: exercise,
        max_results: 1
    })
    .then(function(results) {
        console.log(results.exercises.exercise);
        result_id = results.exercises.exercise.exercise_id;
        result_name = results.exercises.exercise.exercise_name;
        //res.send('Search: '+food +'. Found: '+ result_name + '. ' + result_data);
	fatAPI
            .method('exercise_entries.get', {
              format: 'json',
              exercise_id: result_id
            })
            .then(function(result) {
              console.log(result.exercise);
              result_name = result.exercise.exercise_name;
              result_data = JSON.stringify(result.exercise.minutes.minutes[0].calories);
              res.send('Result: ' + exercise + '. Exercise: ' + result_name + '. Calories burned: ' + result_data + 'kcal'+'. Minutes: 1 '+result.exercise.minutes.minutes[0].minutes); // Send response to user
            });
    })
})

server.post('/',(req,res)=>{
    if (req.body.originalRequest)
    var user_id = req.body.originalRequest.data.source.userId;
    else var user_id="null, from browser/CURL";

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
	
    if(req.body.result.action=='get-food'){
	    var food = req.body.result.resolvedQuery;
	    var rsp={};
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
			fatAPI
				.method('food.get', {
				format: 'json',
				food_id: result_id
			})
				.then(function(result) {
				console.log(result.food);
              			result_name = result.food.food_name;
				rsp = {
					"speech": result_name+". Per 1 "+result.food.servings.serving[0].measurement_description+": Calories: "+result.food.servings.serving[0].calories+" kcal |"+" Carbs: "+result.food.servings.serving[0].carbohydrate+" g |"+" Protein: "+result.food.servings.serving[0].protein+" g |" + " Fat: " +result.food.servings.serving[0].fat+ " g. Is this kind of food correct? (Yes/No)",
					"displayText": result_name+". Per 1 "+result.food.servings.serving[0].measurement_description+": Calories: "+result.food.servings.serving[0].calories+" kcal |"+" Carbs: "+result.food.servings.serving[0].carbohydrate+" g |"+" Protein: "+result.food.servings.serving[0].protein+" g |" +" Fat: " +result.food.servings.serving[0].fat+ " g. Is this kind of food correct? (Yes/No)",
					"source":"get-food"
				};
				 res.json(rsp)
			})
		   
	    })
    } 

    if(req.body.result.action=='get-exercise'){
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
            db.any("insert into consumer(user_id,timestamp,exercise) values($1,now(),$2)",[user_id,payload[0].exercises[0].nf_calories])
            .then(row=>console.log(row))
            .catch(err=>console.log(err))
            res.json(rsp)  
        }).on('error', (payload)=>{ 
            res.send(payload)  
        })
    }   
})

server.listen(PORT, () => { 
    console.log("Server is up and running..." + PORT); 
});
