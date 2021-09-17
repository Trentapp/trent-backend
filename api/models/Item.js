import mongoose from "mongoose"

const ItemSchema = mongoose.Schema({
    typeID: Number, //not used yet, but could indicate what product it is
    typeName: String,
    location: {
        type: { type: String },
        coordinates: []
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
})

export default mongoose.model("Item", ItemSchema);
