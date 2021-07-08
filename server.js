import express from "express"
import cors from "cors"
import routes from "./api/metaRoutes.js"
import dotenv from "dotenv"
import mongoose from "mongoose"

dotenv.config();
const port = process.env.PORT || 8000;

const app = express();

app.use(cors());
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    if ('OPTIONS' == req.method) {
        res.sendStatus(200);
    }
    else {
        next();
    }
});
app.use(express.json());

app.use("/api", routes)
app.use("*", (req, res) => res.status(404).json({ error: "Not found" }));

app.get("/", (req, res) => {
    res.send("Yes it works. Access the api with specific calls to /api .");
});

mongoose.connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(() => console.log("connected to DB!"))
    .catch(err => console.log("Failed to connect to DB: ", err));
mongoose.set('useFindAndModify', false); // Should we use findAndModify instead?

app.listen(port, () => {
    console.log("listening on port ", port);
});
