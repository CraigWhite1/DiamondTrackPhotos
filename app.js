var express = require("express"),
	app = express(),
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
       encrypt: true,
       enableArithAbort: true
   }
};


app.use(express.static(__dirname + "/public"));
app.set("view engine", "ejs");
app.get("/", function(req,res){
	res.render("landing");
});




//Show
app.get("/diamonds/:id", function(req,res){
	res.render("show", {lot:req.params.id});
});

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


app.listen(process.env.PORT || 3000, function() { 
  console.log('Server listening on port 3000'); 
});