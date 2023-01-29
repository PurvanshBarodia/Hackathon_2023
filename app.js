//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const axios = require('axios');
const app = express();


app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

mongoose.set('strictQuery', false);

app.use(session({
  secret: "Our Little Secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/TripSchedulerUser", {
  useNewUrlParser: true
});

const userSchema = mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/trip-scheduler",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("main");
});

app.get('/auth/google',
  passport.authenticate('google', {
    scope: ['profile']
  }));

app.get('/auth/google/trip-scheduler',
  passport.authenticate('google', {
    failureRedirect: '/login'
  }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/next');
  });

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});


app.get("/submit", function(req, res) {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/next", function(req, res) {
  res.render("next");
});

app.post("/submit", function(req, res) {
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, fndUser) {
    if (err) {
      console.log(err);
    } else {
      if (fndUser) {
        fndUser.secret = submittedSecret;
        fndUser.save(function() {
          res.redirect("/main");
        });
      }
    }
  })
});

app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });

});

app.post("/register", function(req, res) {
  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/main")
      })
    }
  })

});

app.get("/main", function(req, res) {
  res.render("main");
});

app.post("/login", function(req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/next");
      })
    }
  })
});
app.get("/plan", function(req, res) {
  res.render("plan");
})
app.post("/next", function(req, res) {
  const from = req.body.from;
  const to = req.body.to;
  const destination = req.body.cityToVisit;
  const budget = req.body.budget;
  const no_of_members = req.body.noOfMembers;
  var arr = []
  console.log(from);
  console.log(to);
  console.log(destination);
  console.log(budget);
  console.log(no_of_members);

  console.log(req.body);
  if (destination === "Ahmedabad") {
    var arr = [
      [72.5808435, 23.0602865],
      [72.587283, 23.086647],
      [72.587132, 23.0240725],
      [72.51442, 23.031391],
      [72.505349, 23.079208],
      [72.6002905, 23.005649]
    ]
  } else if (destination === "Delhi") {
    var arr = [
      [77.2292565, 28.61283],
      [77.209193, 28.614133],
      [77.18572638, 28.52460588],
      [77.225586, 28.589251],
      [77.250117, 28.6400945],
      [77.2411165, 28.655796]
    ]
  } else if (destination === "Hyderabad") {
    var arr = [
      [78.474667, 17.361581],
      [78.40238575, 17.38345225],
      [78.47968138, 17.371594],
      [78.409919, 17.394737],
      [78.409809, 17.429033],
      [78.471661, 17.3585125]
    ]
  } else if (destination === "Mumbai") {
    var arr = [
      [72.826925, 19.098088],
      [72.866602, 19.08956],
      [72.825833, 18.9388545],
      [72.874114,19.109095],
      [72.8231305, 18.9426105],
      [72.815022, 19.009216]
    ]
  }



  const access_token = 'pk.eyJ1IjoicHJhdGhhbTEyIiwiYSI6ImNsZGc2bnZndDBlMjIzcG8wd3hsaXcwZnMifQ.65U7doCPzYQkrzn1e3DJ-w';
  var distances = []
  var durations = []

  async function getDistanceAndDuration() {
    for (var i = 0; i < arr.length; i++) {
      let temp = []
      let temp1 = []
      for (var j = 0; j < arr.length; j++) {
        let start = arr[i];
        let end = arr[j];
        let response = await axios.get(`https://api.mapbox.com/directions/v5/mapbox/driving/${start};${end}?access_token=${access_token}`);
        temp.push(response.data.routes[0].distance / 1000);
        temp1.push(response.data.routes[0].duration / 3600);
      }
      distances.push(temp);
      durations.push(temp1);
    }

  }

  function adjacencyMatrixToGraph(adjMatrix) {
    let graph = []
    for (let i = 0; i < adjMatrix.length; i++) {
      for (let j = 0; j < adjMatrix[i].length; j++) {
        if (adjMatrix[i][j] != 0) {
          graph.push([i, j, adjMatrix[i][j]])
        }
      }
    }
    return graph
  }



  function hamiltonianPathWithOrder(n, graph) {
    // Initialize the dp table with infinity
    let dp = Array(n).fill(null).map(() => Array(1 << n).fill(Number.POSITIVE_INFINITY));
    // Initialize the order table
    let order = Array(n).fill(null).map(() => Array(1 << n).fill([]));

    // Base case: distance from a node to itself is 0
    for (let i = 0; i < n; i++) {
      dp[i][1 << i] = 0;
      order[i][1 << i] = [i];
    }

    // Iterate over all possible subsets
    for (let mask = 1; mask < (1 << n); mask++) {
      for (let i = 0; i < n; i++) {
        if (!(mask & (1 << i))) {
          continue;
        }
        for (let j = 0; j < n; j++) {
          if (mask & (1 << j)) {
            continue;
          }
          // Check if there is an edge between i and j
          for (let [u, v, w] of graph) {
            if (u === i && v === j) {
              if (dp[i][mask] + w < dp[j][mask | (1 << j)]) {
                dp[j][mask | (1 << j)] = dp[i][mask] + w;
                order[j][mask | (1 << j)] = order[i][mask].concat([j]);
              }
            }
          }
        }
      }
    }

    let minDistance = Number.POSITIVE_INFINITY;
    let minOrder = [];
    // Find the minimum distance over all possible starting nodes
    for (let i = 0; i < n; i++) {
      if (dp[i][(1 << n) - 1] < minDistance) {
        minDistance = dp[i][(1 << n) - 1];
        minOrder = order[i][(1 << n) - 1];
      }
    }
    return [minDistance, minOrder];
  }
  getDistanceAndDuration().then(() => {
    k = adjacencyMatrixToGraph(distances);
    // Number of nodes
    let n = 6;


    // Call the function to find the length of the shortest path
    var results = hamiltonianPathWithOrder(n, k);

    var tot_dist = results[0];
    for(var i=0; i< results[1].length; i++){
      if(destination === "Ahmedabad"){
        if(results[1][i] === 0){
          results[1][i] = "Gandhi Museum";
        }
        else if(results[1][i] === 1){
          results[1][i] = "Sabarmati Ashram";
        }
        else if(results[1][i] === 2){
          results[1][i] = "The Grand Bhagwati";
        }
        else if(results[1][i] === 3){
          results[1][i] = "Sarkhej Roza";
        }
        else if(results[1][i] === 4){
          results[1][i] = "Science City";
        }
        else if(results[1][i] === 5){
          results[1][i] = "Kankaria Lake";
        }
      }

      else if(destination === "Mumbai"){
        if(results[1][i] === 0){
          results[1][i] = "Juhu Beach";
        }
        else if(results[1][i] === 1){
          results[1][i] = "Chhathrapati Shivaji Terminus";
        }
        else if(results[1][i] === 2){
          results[1][i] = "Wankhede stadiumi";
        }
        else if(results[1][i] === 3){
          results[1][i] = "leela hotel";
        }
        else if(results[1][i] === 4){
          results[1][i] = "Marine Drive";
        }
        else if(results[1][i] === 5){
          results[1][i] = "Worli sea face";
        }
      }

      else if(destination === "Delhi"){
        if(results[1][i] === 0){
          results[1][i] = "India Gate";
        }
        else if(results[1][i] === 1){
          results[1][i] = "Rashtrapati bhavan";
        }
        else if(results[1][i] === 2){
          results[1][i] = "Qutub minar";
        }
        else if(results[1][i] === 3){
          results[1][i] = "All American restaurant";
        }
        else if(results[1][i] === 4){
          results[1][i] = "Rai ghat";
        }
        else if(results[1][i] === 5){
          results[1][i] = "Red Fort";
        }
      }

      else if(destination === "Hyderabad"){
        if(results[1][i] === 0){
          results[1][i] = "Charminar";
        }
        else if(results[1][i] === 1){
          results[1][i] = "Golkonda";
        }
        else if(results[1][i] === 2){
          results[1][i] = "Salar jung museum";
        }
        else if(results[1][i] === 3){
          results[1][i] = "Qutub shahi tomb";
        }
        else if(results[1][i] === 4){
          results[1][i] = "Tatva restaurant";
        }
        else if(results[1][i] === 5){
          results[1][i] = "Chowmalla palace Hyderabad";
        }
      }
    }
    var first_place = results[1][0];
    var second_place = results[1][1];
    var third_place = results[1][2];
    var fourth_place = results[1][3];
    var fifth_place = results[1][4];
    var sixth_place = results[1][5];
    res.render("plan",{results: results[1],day:from});
    console.log(results[1]);

  });
});


app.get("/final", function(req, res) {
  res.render("final")
})

app.post("/final", function(req, res) {
  res.render("plan");
})


app.listen(3000, function() {
  console.log("Server started on port 3000");
});
