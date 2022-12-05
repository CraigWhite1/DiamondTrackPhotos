var express = require("express"),
	app = express(),
	urlExists = require('url-exists'),
	bodyParser = require("body-parser"),
	request = require('request'),
	sql = require("mssql");

// Create a configuration object for our Azure SQL connection parameters
var dbConfig = {
 server: "gemelodyphotosapp.database.windows.net", // Use your SQL server name
 database: "photos", // Database to connect to
 user: "bluenilelogin", // Use your username
 password: "Danielle9", // Use your password
 port: 1433,
 // Since we're on Windows Azure, we need to set the following options
 options: {
       encrypt: true
   }
};

// // This function connects to a SQL server, executes a SELECT statement,
// // and displays the results in the console.
// function getCerts(id) {
//  // Create connection instance
//  var conn = new sql.ConnectionPool(dbConfig);

//  conn.connect()
//  // Successfull connection
//  .then(function () {

//    // Create request instance, passing in connection instance
//    var req = new sql.Request(conn);

//    // Call mssql's query method passing in params
//    req.query("SELECT * FROM Certs where lotName = '"+id+"'")
//    .then(function (recordset) {
//      console.log(recordset);
//      conn.close();
//    })
//    // Handle sql statement execution errors
//    .catch(function (err) {
//      console.log(err);
//      conn.close();
//    })

//  })
//  // Handle connection errors
//  .catch(function (err) {
//    console.log(err);
//    conn.close();
//  });
// }


// getCerts("JEI1614");

app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.get("/", function(req,res){
	res.render("landing");
});




//Show
app.get("/diamonds/:id", function(req,res){
	res.render("show", {lot:req.params.id});
});

//Jewelry old way
// app.get("/jewelry/:id", function(req,res){
// 	var i;
// 	let options = {json: true, method: 'get'};
// 	request('https://gemelody.blob.core.windows.net/img/data.json',options, function (error,response, body) {
// 	const words = body; 
// 		var found = false;
// 		for(i=0;i<words.length;++i)
// 	 	{
// 	 		found = false;
// 	 		if(words[i].LotName===req.params.id){
// 	 		console.log(i);
// 	 		found = true;	
// 	 		break;
// 	 		};
// 	 	};	
// 		if (found == true){
// 			//Check to see if cert exists
// 			console.log(words[i].Certno)
// 			if(words[i].Certno.length > 0){
// 				console.log("Cert exists")
// 				request('https://gemelody.blob.core.windows.net/img/'+words[i].Certno+'.pdf', function (error,response, body) {
// 					 if(response.statusCode==404){
// 					 	console.log("Cert exists but not on blob")
// 					 	words[i]['Certno'] = "NoCert"
// 					 	res.render("jewelry", {words:words[i]});
// 					 }
// 					 res.render("jewelry", {words:words[i]});
// 				});	
// 			}else{
// 				console.log("Cert does Not exist")
// 				words[i]['Certno'] = "NoCert"
// 				res.render("jewelry", {words:words[i]});
// 			}
// 		}
// 		else {
// 				// Taking out the error page for now
// 				res.render("error",{words:{LotName:'error'}});
// 				// res.render("jewelry", {words:{lotName:req.params.id}});
// 			}
// 	})
// });


//Jewelry
app.get("/jewelry/:id", function(req,res){
	var conn = new sql.ConnectionPool(dbConfig);
	conn.connect(function (err) {
	if (err)
	console.log(err);

	var request = new sql.Request(conn);

	request.query("SELECT * FROM Certs where LotName = '"+req.params.id+"';", function (err, result) {

	if (err) {
		console.log(err)
		res.render("error",{words:{LotName:'error'}});
	}
	// var rowsCount = result.rowsAffected;
	sql.close();
	res.render('jewelry', {
		details: result.recordset,
		lot: req.params.id
	});

	}); // request.query
	}); // sql.connvar i;
});

//test
app.get("/test/:id", function(req,res){
	var conn = new sql.ConnectionPool(dbConfig);
	conn.connect(function (err) {
	if (err)
	console.log(err);

	var request = new sql.Request(conn);

	request.query("SELECT * FROM Certs where LotName = '"+req.params.id+"';", function (err, result) {

	if (err) {
		console.log(err)
		res.render("error",{words:{LotName:'error'}});
	}
	// var rowsCount = result.rowsAffected;
	sql.close();
	res.render('test', {
	details: result.recordset,
	lot: req.params.id
	});

	}); // request.query
	}); // sql.conn
});

// Commenting out this one until we need to add back in the details of the pieces. For now we just want pic and video
// app.get("/jewelry/:id", function(req,res){
// 	res.render("jewelry", {words:{lotName:req.params.id}});
// });

app.listen(process.env.PORT || 3000, function() { 
  console.log('Server listening on port 3000'); 
});