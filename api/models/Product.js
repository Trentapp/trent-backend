import mongoose from "mongoose"

export const AddressSchema = mongoose.Schema({
    streetWithNr: String,
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
        perDay: Number,//add sth like currency later
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
    pictures: [ImageSchema],
    picturesFitted: [ImageSchema],
    thumbnails: [ImageSchema],
    free: {
        type: Boolean,
        default: function() {
            return !(this.prices.perHour || this.prices.perDay);
        }
    }
});

// ProductSchema.index({name: "text", location: "2dsphere"});
ProductSchema.index({name: "text"});
export default mongoose.model("Product", ProductSchema);
