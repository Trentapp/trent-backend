import mongoose from "mongoose"

const ReviewSchema = mongoose.Schema({ //to be extended
    title: {
        type: String,
        required: true,
    },
    comment: String,
    poster: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },//_id of user who posted the review
    ratedUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },//_id of user who was rated
    stars: {
        type: Number,
        required: true,
    } // maybe add a borrowed product property later
});
ReviewSchema.index({title: "text"});
export default mongoose.model("Review", ReviewSchema);
