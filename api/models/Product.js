import mongoose from "mongoose"

export const AddressSchema = mongoose.Schema({
    street: String,
    houseNumber: String,
    zipcode: String,
    city: String,
    country: String
});

const ImageSchema = mongoose.Schema({
    data: Buffer,
    contentType: String,
});

const ProductSchema = mongoose.Schema({ //to be extended
    name: {
        type: String,
        required: true
    },
    desc: {
        type: String,
        required: true
    },
    prices:{
        perHour: Number,//saying everything is in € for the beginning
        perDay: Number
    },
    location: {
        type: { type: String },
        coordinates: []
    },
    address: {
        type: AddressSchema,
        required: true
    },
    user: String,
    thumbnail: String,
    pictures: [ImageSchema]
});

ProductSchema.index({name: "text", location: "2dsphere"});
export default mongoose.model("Products", ProductSchema);
