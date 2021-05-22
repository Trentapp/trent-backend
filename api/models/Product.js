import mongoose from "mongoose"


const ProductSchema = mongoose.Schema({ //to be extended
    name: {
        type: String,
        required: true,
    },
    desc: {
        type: String,
        required: true,
    },
    pricePerHour: Number,//saying everything is in € for the beginning
    pricePerDay: Number,
});
ProductSchema.index({name: "text"});
export default mongoose.model("Products", ProductSchema);
