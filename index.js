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
const RapidAPI = require('rapidapi-connect');
const rapid = new RapidAPI("default-application_5acdd39de4b06ec3937ba3fd", "16a6f4ee-836d-43d3-85d2-370fbebc324c");
const pgp = require('pg-promise')(initOptions);
pgp.pg.defaults.ssl = true;
const db = pgp(process.env.DATABASE_URL);
//const sqlite = require('sqlite3').verbose();
//const db = new sqlite.Database('slimme.db');
//db.run("CREATE TABLE IF NOT EXISTS consumer (user_id,timestamp datetime default current_timestamp,age,weight,height,gender,weightgoal,consume,activity,exercise)");

// const { Client } = require('pg');

// const db = new Client({
//   connectionString: process.env.DATABASE_URL,
//   ssl: true,
// });

// db.connect();
db.any('create table if not exists consumer(id serial primary key, user_id varchar(200),timestamp timestamp,age int,weight int, height int,gender varchar(10),weightgoal varchar(100),consume int,activity varchar(100),exercise int);')
    .then(data => console.log(data))
    .catch(error => console.log(error))
//   if (err) throw err;
//   for (let row of res.rows) {
//     console.log(JSON.stringify(row));
//   }
//   db.end();
// });

const server = express();
server.use(bodyParser.urlencoded({
    extended: true
}));

function getRequiredCalorie(weight, gender, height, age, activity, weightgoal) {
    const properWeight = Math.round(height * height * 0.0022);
    console.log('proper: ' + properWeight);

    let bmr;
    if (gender == 'female') {
        bmr = Math.round(655.1 + (9.563 * weight) + (1.85 * height) - (4.676 * age));
    } else if (gender == 'male') {
        bmr = Math.round(66.5 + (13.75 * weight) + (5.003 * height) - (6.755 * age));
    }
    console.log('bmr: ' + bmr);
    let activityFactor;
    // Activity Factor
    if (activity == 'a') {
        activityFactor = 1.2;
    } else if (activity == 'b') {
        activityFactor = 1.375;
    } else if (activity == 'c') {
        activityFactor = 1.55;
    } else if (activity == 'd') {
        activityFactor = 1.725;
    } else if (activity == 'e') {
        activityFactor = 1.9;
    }
    console.log('activ: ' + activityFactor);

    let weightgoalFactor;
    // Weight Goal
    if (weightgoal == 'Stay the same weight') {
        weightgoalFactor = 0;
    } else if (weightgoal == 'Lose 0.25 kg per week') {
        weightgoalFactor = 250;
    } else if (weightgoal == 'Lose 0.5 kg per week') {
        weightgoalFactor = 500;
    }
    console.log('weightgoal: ' + weightgoalFactor);
    const requiredCalorie = Math.round((bmr * activityFactor) - weightgoalFactor);
    console.log('req calorie: ' + requiredCalorie)
    return requiredCalorie;
}

function properWeight(height) {
    let properWeight = Math.round(height * height * 0.0022);
    console.log('proper: ' + properWeight);
    return properWeight

}

server.use(bodyParser.json());

server.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/home.html'));
})

server.get('/db', (req, res) => {
    txt = []
    db.any('select * from consumer')
        .then(data => {
            res.json(data);
        })
        .catch(error => {
            res.send(error)
        })
})

server.get('/insert', (req, res) => {
    txt = []
    db.any("insert into consumer(user_id,timestamp,age,gender,weight,height,weightgoal,activity) values('test',now(),'44','female','64','164','Stay the same weight','a')")
        .then(data => {
            res.json(data);
        })
        .catch(error => {
            res.send(error)
        })
})

server.get('/about', (req, res) => {
    res.sendFile(path.join(__dirname + '/about.html'));
})

server.get('/user-profile', (req, res) => {
    res.sendFile(path.join(__dirname + '/user-profile.html'));
})

server.get('/track-calorie', (req, res) => {
    res.sendFile(path.join(__dirname + '/track-calorie.html'));
})

server.get('/getreq', (req, res) => {
    user_id = req.query.user_id
    db.any("select * from consumer where user_id=$1 AND weight>0 AND height>0 AND age>0", [user_id])
        .then(data => res.json(getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal'])))
        .catch(error => res.json(error))
})

server.get('/getdaily', (req, res) => {
    user_id = req.query.user_id
    req = 0;
    db.any("select * from consumer where user_id=$1 AND weight>0 AND height>0 AND age>0", [user_id])
        .then(data => {
            req = getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal'])
        })
        .catch(err => console.log(err))
    db.any("select sum(consume) as cons,sum(exercise) as exc from consumer where user_id=$1 and date(timestamp)=date(now())", [user_id])
        .then(data => {
            rem = parseFloat(req) - parseFloat(data[0]['cons']) + parseFloat(data[0]['exc'])
            res.json({
                "speech": "Your daily calorie " + req + " k-calories. Intake " + data[0]['cons'] + " kCal. Burned " + data[0]['exc'] + ". Remaining is " + rem,
                "displayText": "Your daily calorie " + req + " k-calories. Intake " + data[0]['cons'] + " kCal. Burned " + data[0]['exc'] + ". Remaining is " + rem,
                "source": "daily-calorie"
            })
        })
        .catch(err => console.log(err))
})

server.get('/get-calorie', (req, res) => {
    rapid.call('Nutritionix', 'getFoodsNutrients', {
        'applicationId': '4c64f5c3',
        'foodDescription': req.query.what,
        'applicationSecret': 'ad4538d485233756557afd8aee6f530b'
    }).on('success', (payload) => {
        res.json(payload[0].foods[0].nf_calories);
    }).on('error', (payload) => {
        res.send(payload);
    });
})

server.get('/get-burncalorie', (req, res) => {
    rapid.call('Nutritionix', 'getCaloriesBurnedForExercises', {
        'exerciseDescription': req.query.what,
        'applicationSecret': 'ad4538d485233756557afd8aee6f530b',
        'applicationId': '4c64f5c3'
    }).on('success', (payload) => {
        res.json(payload[0]);
    }).on('error', (payload) => {
        res.send(payload);
    });
})

server.get('/get-myProfile', (req, res) => {
    user_id = req.query.user_id
    req = 0;
    db.any("select * from consumer where user_id=$1 AND weight>0 AND height>0 AND age>0", [user_id])
        .then(data => {
            proper = properWeight(data[0]['height'])
            console.log(proper)
            res.json({
                "speech": "Your profile : Age: " + data[0]['age'] + "y. Gender: " + data[0]['gender'] + ". Weight " + data[0]['weight'] + "kg. Height " + data[0]['height'] + "cm. Ideal Body Weight " + proper + "kg.",
                "displayText": "Your profile : Age: " + data[0]['age'] + "y. Gender: " + data[0]['gender'] + ". Weight " + data[0]['weight'] + "kg. Height " + data[0]['height'] + "cm. Ideal Body Weight " + proper + "kg.",
                "source": "my-profile"
            })
        })
        .catch(err => console.log(err))
})

server.post('/', (req, res) => {
    var user_id = req.body.originalRequest.data.source.userId;

    if (req.body.result.action == 'get-weight') {
        rsp = {
            "speech": req.body.result.resolveQuery,
            "displayText": req.body.result.resolveQuery,
            "source": "get-weight"
        }
        db.any("insert into consumer(user_id,timestamp,weight) values($1,now(),$2)", [user_id, req.body.result.resolvedQuery.split(' ')[0]])
            .then(res => console.log(res))
            .catch(err => console.log(err))
        res.json(rsp)
    }

    if (req.body.result.action == 'get-gender') {
        rsp = {
            "speech": req.body.result.resolveQuery,
            "displayText": req.body.result.resolveQuery,
            "source": "get-gender"
        }
        db.any("update consumer set gender=$1 where user_id=$2", [req.body.result.resolvedQuery.toLowerCase(), user_id])
            .then(res => console.log(res))
            .catch(err => console.log(err))
        res.json(rsp)
    }

    if (req.body.result.action == 'get-height') {
        rsp = {
            "speech": req.body.result.resolveQuery,
            "displayText": req.body.result.resolveQuery,
            "source": "get-height"
        }
        db.any("update consumer set height=$1 where user_id=$2", [req.body.result.resolvedQuery.split(' ')[0], user_id])
            .then(res => console.log(res))
            .catch(err => console.log(err))
        res.json(rsp)
    }

    if (req.body.result.action == 'get-age') {
        rsp = {
            "speech": req.body.result.resolveQuery,
            "displayText": req.body.result.resolveQuery,
            "source": "get-age"
        }
        db.any("update consumer set age=$1 where user_id=$2", [req.body.result.resolvedQuery.split(' ')[0], user_id])
            .then(res => console.log(res))
            .catch(err => console.log(err))
        res.json(rsp)
    }

    if (req.body.result.action == 'get-activity') {
        rsp = {
            "speech": req.body.result.resolveQuery,
            "displayText": req.body.result.resolveQuery,
            "source": "get-activity"
        }
        db.any("update consumer set activity=$1 where user_id=$2", [req.body.result.resolvedQuery.toLowerCase(), user_id])
            .then(res => console.log(res))
            .catch(err => console.log(err))
        res.json(rsp)
    }

    if (req.body.result.action == 'get-weightgoal') {
        rsp ={};
        db.any("update consumer set weightgoal=$1 where user_id=$2", [req.body.result.resolvedQuery, user_id])
            .then(res => console.log(res))
            .catch(err => console.log(err))
        db.any("select * from consumer where user_id=$1 order by timestamp desc limit 1", [user_id])
            .then(data => {
                rsp = {
                    "speech": "In order to reach your weight goal, you would have to consume " + getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal']) + " kcal a day, Do you want to start your diet today?(Yes?No)",
                    "displayText": "In order to reach your weight goal, you would have to consume " + getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal']) + " kcal a day, Do you want to start your diet today?(Yes/No)",
                    "source": "get-weightgoal"
                };
                res.json(rsp)
            })
            .catch(err => console.log(err))
    }

    if (req.body.result.action == 'daily-calorie') {
        req = 0;
        rsp = {};
        db.any("select * from consumer where user_id=$1 AND weight>0 AND height>0 AND age>0", [user_id])
            .then(data => {
                req = getRequiredCalorie(data[0]['weight'], data[0]['gender'], data[0]['height'], data[0]['age'], data[0]['activity'], data[0]['weightgoal'])            
        })
        .catch(err => console.log(err))
        db.any("select sum(consume) as cons,sum(exercise) as exc from consumer where user_id=$1 and date(timestamp)=date(now())", [user_id])
                .then(data => {
                    rem = parseFloat(req) - parseFloat(data[0]['cons']) + parseFloat(data[0]['exc'])
                    rsp = {
                        "speech": "Your daily calorie needs is " + req + " k-calories. Intake " + data[0]['cons'] + " kCal. Burned is " + data[0]['exc'] + " kCal. Remaining is " + rem + " kCal.",
                        "displayText": "Your daily calorie needs is " + req + " k-calories. Intake " + data[0]['cons'] + " kCal. Burned is " + data[0]['exc'] + " kCal. Remaining is " + rem + " kCal.",
                        "source": "daily-calorie"
                    }
        })
        .catch(err => console.log(err))
        res.json(rsp)
    }

    if (req.body.result.action == 'get-calorie') {
        //db.run("insert into consumer(user_id) values(?)"+user_id);
        rsp = {};
        rapid.call('Nutritionix', 'getFoodsNutrients', {
            'applicationId': '4c64f5c3',
            'foodDescription': req.body.result.resolvedQuery,
            'applicationSecret': 'ad4538d485233756557afd8aee6f530b'
        }).on('success', (payload) => {
            rsp = {
                "speech": "You consume " + payload[0].foods[0].nf_calories + " k-calories.",
                "displayText": "You consume " + payload[0].foods[0].nf_calories + " k-calories.",
                "source": "get-calorie"
            }
            db.any("insert into consumer(user_id,timestamp,consume) values($1,now(),$2)", [user_id, payload[0].foods[0].nf_calories])
                .then(row => console.log(row))
                .catch(err => console.log(err))
            res.json(rsp)
        }).on('error', (payload) => {
            res.send(payload);
        });
    }

    if (req.body.result.action == 'burn-calorie') {
        rapid.call('Nutritionix', 'getCaloriesBurnedForExercises', {
            'exerciseDescription': req.body.result.resolvedQuery,
            'applicationSecret': 'ad4538d485233756557afd8aee6f530b',
            'applicationId': '4c64f5c3'
        }).on('success', (payload) => {
            rsp = {
                "speech": "Yay! You just burn " + payload[0].exercises[0].nf_calories + " k-calories. Keep it up!",
                "displayText": "Yay! You just burn " + payload[0].exercises[0].nf_calories + " k-calories. Keep it up!",
                "source": "burn-calorie"
            }
            db.any("insert into consumer(user_id,timestamp,exercise) values($1,now(),$2)", [user_id, payload[0].exercises[0].nf_calories])
                .then(row => console.log(row))
                .catch(err => console.log(err))
            res.json(rsp)
        }).on('error', (payload) => {
            res.send(payload)
        })
    }

    if (req.body.result.action == 'my-profile') {
        req = 0;
        rsp = {};
        db.any("select * from consumer where user_id=$1 AND weight>0 AND height>0 AND age>0", [user_id])
            .then(data => {
                proper = properWeight(data[0]['height'])
                console.log(proper)
                res.json({
                    "speech": "Your profile : Age: " + data[0]['age'] + "y. Gender: " + data[0]['gender'] + ". Weight " + data[0]['weight'] + "kg. Height " + data[0]['height'] + "cm. Ideal Body Weight " + proper + "kg.",
                    "displayText": "Your profile : Age: " + data[0]['age'] + "y. Gender: " + data[0]['gender'] + ". Weight " + data[0]['weight'] + "kg. Height " + data[0]['height'] + "cm. Ideal Body Weight " + proper + "kg.",
                    "source": "my-profile"
                })
            })
            .catch(err => console.log(err))
    }

})

server.listen(PORT, () => {
    console.log("Server is up and running..." + PORT);
});
