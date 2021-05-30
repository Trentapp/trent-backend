import mongoose from "mongoose"

const AddressSchema = mongoose.Schema({
    street: String,
    houseNumber: String,
    zipcode: String,
    city: String,
    country: String,
});

const ImageSchema = mongoose.Schema({
    data: Buffer,
    contentType: String,
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
    pictures: [{img: ImageSchema}],
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
    },
});
ProductSchema.index({name: "text"});
export default mongoose.model("Products", ProductSchema);
