import express from "express"
import cors from "cors"
import routes from "./api/metaRoutes.js"
import dotenv from "dotenv"
import mongoose from "mongoose"

import Logger from "./Logger.js"

dotenv.config();
const port = process.env.PORT || 8000;

const app = express();

app.use(cors());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET, DELETE, PUT, PATCH, POST');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
app.use(express.json());

app.get("/.well-known/apple-app-site-association", (req, res) => {
  res.sendFile( process.cwd() + "/apple-app-site-association.json")
});

app.use("/api", routes)
app.use("*", (req, res) => {res.status(404).json({error: "Not found"}); Logger.shared.log(`Accessed invalid url ${req.originalUrl}`)});

app.get("/", (req, res) => {
    res.send("Yes it works. Access the api with specific calls to /api .");
});

if (process.env.ENV == "production"){
    mongoose.connect(process.env.PROD_DATABASE_URI, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
    .then(() => Logger.shared.log(`Connected to DB`))
    .catch(err => Logger.shared.log(`Failed to connect to DB`, 1));
} else {//dev
    mongoose.connect(process.env.DEV_DATABASE_URI, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true})
    .then(() => Logger.shared.log(`Connected to DB`))
    .catch(err => Logger.shared.log(`Failed to connect to DB`, 1));
}

mongoose.set('useFindAndModify', false); // Should we use findAndModify instead?

app.listen(port, () => {
    Logger.shared.log(`Server started; listening on port ${port}`)
});
