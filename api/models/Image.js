import mongoose from "mongoose"

const ImageSchema = new mongoose.Schema({
    img: String
});

export default mongoose.model("Image", ImageSchema, "imgs");
