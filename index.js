const express = require('express'); 
const bodyParser = require('body-parser'); 
const http = require('http'); 
const API_KEY = require('./apiKey'); 
const PORT = process.env.PORT || 5000 
const path = require('path');
<<<<<<< HEAD

const RapidAPI = require('rapidapi-connect');
const rapid = new RapidAPI("default-application_5acdd39de4b06ec3937ba3fd","16a6f4ee-836d-43d3-85d2-370fbebc324c");
=======
>>>>>>> d25dd276525db8010ac7fdd8bc336f5728e36150

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

<<<<<<< HEAD
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
=======
server.get('/get-calorie',(req,res)=>{
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
>>>>>>> d25dd276525db8010ac7fdd8bc336f5728e36150

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
            'exerciseDescription': req.body.result.parameters.what, 
            'applicationSecret': 'ad4538d485233756557afd8aee6f530b', 
            'applicationId': '4c64f5c3' 
        }).on('success', (payload)=>{ 
            res.json(payload[0])  
        }).on('error', (payload)=>{ 
            res.send(payload)  
        })
    }         
})

server.listen(PORT, () => { 
    console.log("Server is up and running..." + PORT); 
});
