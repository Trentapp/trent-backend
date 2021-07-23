import mongoose from "mongoose"

export const AddressSchema = mongoose.Schema({
    street: String,
    houseNumber: String,
    zipcode: String,
    city: String,
    country: String
});

export const ImageSchema = mongoose.Schema({
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
        perDay: {
            type: Number,
            required: true,
        },//add sth like currency later
    },
    location: {
        type: { type: String },
        coordinates: []
    },
    address: {
        type: AddressSchema,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    thumbnail: ImageSchema,
    pictures: [ImageSchema]
});

// ProductSchema.index({name: "text", location: "2dsphere"});
ProductSchema.index({name: "text"});
export default mongoose.model("Product", ProductSchema);
