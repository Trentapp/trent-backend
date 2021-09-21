import mongoose from "mongoose"

const PostSchema = mongoose.Schema({
    typeId: Number, //ID of product (e.g. ID of "Bierbänke und Tische" is 0)
    typeName: String, //not currently used, but could contain sth like "Bierbänke und Tische" or some shorter tag that is still readable "Bb&T"
    desc: String, //date and price are currently handled in desc
    location: {
        type: { type: String },
        coordinates: []
    },
    user: { //poster
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    timestamp: {
		type: Date,
		required: true
	},
});

export default mongoose.model("Post", PostSchema);
