import express from "express"
import cors from "cors"
import routes from "./api/metaRoutes.js"
import dotenv from "dotenv"
import mongoose from "mongoose"

dotenv.config();
const port = process.env.PORT || 8000;

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes)
app.use("*", (req, res) => res.status(404).json({error: "Not found"}));

app.get("/", (req,res) => {
    res.send("Yes it works. Access the api with specific calls to /api .");
});

mongoose.connect(process.env.DATABASE_URI, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true}, () => console.log("connected to DB!"));

app.listen(port, () => {
    console.log("listening on port ", port);
});
