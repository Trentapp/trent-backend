import mongoose from "mongoose"

const AddressSchema = mongoose.Schema({
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
    pricePerHour: Number,//saying everything is in € for the beginning
    pricePerDay: Number,
    address: {
        type: AddressSchema,
        required: true,
    }
});
ProductSchema.index({name: "text"});
export default mongoose.model("Products", ProductSchema);
