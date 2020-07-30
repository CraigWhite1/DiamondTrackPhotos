var express = require("express"),
	app = express(),
	urlExists = require('url-exists'),
	bodyParser = require("body-parser"),
	request = require('request');


app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

app.get("/", function(req,res){
	res.render("landing");
});


//Show
app.get("/diamonds/:id", function(req,res){
	res.render("show", {stone: req.params.id});
});

//Jewelry
app.get("/jewelry/:id", function(req,res){
	var i;
	request('https://gemelody.blob.core.windows.net/img/data.json', function (error, response, body) {
	if (!error && response.statusCode === 200) {
	const words = JSON.parse(body);
	var found = false;
	// console.log(words);
	for(i=0;i<words.length;++i)
 	{
 		found = false;
 		if(words[i].lotName===req.params.id){
 		console.log(i);
 		found = true;	
 		break;
 		};
 };	
	if (found == true){
		res.render("jewelry", {words:words[i]});
	}
	else {
			res.render("error",{words:{lotName:'error'}});
		}
} else {
    console.log("Got an error: ", error, ", status code: ", response.statusCode);
  }

})
});

app.listen(process.env.PORT || 3000, function() { 
  console.log('Server listening on port 3000'); 
});