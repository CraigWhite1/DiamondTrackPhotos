var express = require("express"),
	app = express(),
	urlExists = require('url-exists'),
	bodyParser = require("body-parser");


app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

app.get("/", function(req,res){
	res.render("landing");
});


//Show
app.get("/stones/:id", function(req,res){
	res.render("show", {stone: req.params.id});
});

app.listen(process.env.PORT || 3000, function() { 
  console.log('Server listening on port 3000'); 
});