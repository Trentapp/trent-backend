import mongoose from "mongoose"

const PostSchema = mongoose.Schema({
    typeIds: [Number], //IDs of items (e.g. ID of "Bierbänke und Tische" is 0)
    typeNames: [String], //not currently used, but could contain sth like "Bierbänke und Tische" or some shorter tag that is still readable "Bb&T"
    comment: String, //date and price are currently handled in comment
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
    status: {
        type: Number, // 0 is open/active (still searching for a lender); 1 is closed (found a lender) and 2 is cancelled (no lender, but not searching anymore)
        required: true
    }
});

export default mongoose.model("Post", PostSchema);
