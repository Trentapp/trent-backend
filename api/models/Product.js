import mongoose from "mongoose"

export const AddressSchema = mongoose.Schema({
    street: String,
    houseNumber: String,
    zipcode: String,
    city: String,
    country: String,
});

const ProductSchema = mongoose.Schema({ //to be extended
    name: {
        type: String,
        required: true,
    },
    desc: {
        type: String,
        required: true,
    },
    thumbnail: String,
    pictures: [String],
    prices:{
        perHour: Number,//saying everything is in € for the beginning
        perDay: Number,
    },
    address: {
        type: AddressSchema,
        required: true,
    },
    location: {
        lat: Number,
        lng: Number,
    }
});
ProductSchema.index({name: "text"});
export default mongoose.model("Products", ProductSchema);
