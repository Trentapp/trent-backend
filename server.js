import express from "express"
import cors from "cors"
import routes from "./api/routes.js"
import dotenv from "dotenv"

dotenv.config();
const port = process.env.PORT || 8000;

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", routes)
app.use("*", (req, res) => res.status(404).json({error: "Not fount"}));

app.listen(port, () => {
    console.log("listening on port ", port);
})

