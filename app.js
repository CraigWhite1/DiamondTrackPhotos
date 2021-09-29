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
	res.render("show", {words:{lotName:req.params.id}});
});

//Jewelry
app.get("/jewelry/:id", function(req,res){
	var i;
	let options = {json: true, method: 'get'};
	request('https://gemelody.blob.core.windows.net/img/data.json',options, function (error,response, body) {
	const words = body; 
		var found = false;
		for(i=0;i<words.length;++i)
	 	{
	 		found = false;
	 		if(words[i].LotName===req.params.id){
	 		console.log(i);
	 		found = true;	
	 		break;
	 		};
	 	};	
		if (found == true){
			//Check to see if cert exists
			console.log(words[i].Certno)
			if(words[i].Certno.length > 0){
				console.log("Cert exists")
				request('https://gemelody.blob.core.windows.net/img/'+words[i].Certno+'.pdf', function (error,response, body) {
					 if(response.statusCode==404){
					 	console.log("Cert exists but not on blob")
					 	words[i]['Certno'] = "NoCert"
					 	res.render("jewelry", {words:words[i]});
					 }
					 res.render("jewelry", {words:words[i]});
				});	
			}else{
				console.log("Cert does Not exist")
				words[i]['Certno'] = "NoCert"
				res.render("jewelry", {words:words[i]});
			}
		}
		else {
				// Taking out the error page for now
				res.render("error",{words:{LotName:'error'}});
				// res.render("jewelry", {words:{lotName:req.params.id}});
			}
	})
});

// Commenting out this one until we need to add back in the details of the pieces. For now we just want pic and video
// app.get("/jewelry/:id", function(req,res){
// 	res.render("jewelry", {words:{lotName:req.params.id}});
// });

app.listen(process.env.PORT || 3000, function() { 
  console.log('Server listening on port 3000'); 
});