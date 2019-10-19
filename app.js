var express = require("express"),
	app = express(),
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

app.listen(3000, function() { 
  console.log('Server listening on port 3000'); 
});