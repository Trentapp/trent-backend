import mongoose from "mongoose"

const ReviewSchema = mongoose.Schema({ //to be extended
    title: {
        type: String,
        required: true,
    },
    comment: String,
    posterId: String,
    ratedUserId: String,
    stars: {
        type: Number,
        required: true,
    } // maybe add a borrowed product property later
});
ReviewSchema.index({title: "text"});
export default mongoose.model("Reviews", ReviewSchema);
