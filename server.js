const express = require("express");
const path = require("path");

const app = express();
const port = 8000;

app.get("/status", (req,res) => {
	res.status(200).send("Wenns ankommt ist gut xD");
});

app.get("/", (req, res) => {
	res.send("Hello World!");
});




app.listen(port, () => {
	console.log("Listening on localhost port ", port);
});


