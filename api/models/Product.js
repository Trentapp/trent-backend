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
    price: { // At least one of perHour and perDay should be required. See how to do that later.
        perHour: {
            type: Number,//saying everything is in € for the beginning
        },
        perDay: {
            type: Number,
        },
    }
});

export default mongoose.model("Products", ProductSchema);
