import mongoose from "mongoose"

const ItemSchema = mongoose.Schema({
    typeId: Number, //ID of product (e.g. ID of "Bierbänke und Tische" is 0)
    typeName: String, //not currently used, but could contain sth like "Bierbänke und Tische" or some shorter tag that is still readable "Bb&T"
    location: {
        type: { type: String },
        coordinates: [Number]
    },
    user: { // owner
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
});

export default mongoose.model("Item", ItemSchema);
