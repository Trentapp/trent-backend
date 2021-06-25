import express from "express"

import Review from "../models/Review.js"
import User from "../models/User.js";
//not sure if I need the following
//import User from "../models/User.js"
//import Product from "../models/Product.js"

const reviewRouter = express.Router();

// every route here has the prefix /api/reviews

reviewRouter.post("/create", async (req,res) => {
    try {
        const user = await User.findOne({uid: req.body.uid});
        console.log(user, req.body.review.posterId);
        if (user._id != req.body.review.posterId){
            throw "user identification incorrect";
        } else {
            await Review.create(req.body.review);
            const owner = await User.findById(req.ratedUserId);
            const new_user_rating = (owner.rating * user.numberOfRatings + req.body.stars)/(owner.numberOfRatings + 1);
            await User.findByIdAndUpdate(owner._id, {rating: new_user_rating, numberOfRatings: (owner.numberOfRatings + 1)});
            res.status(200).json({status: "success"});
            res.status(200).json({status: "success"});
        }
    } catch(e) {
        res.status(500).json({message:e});
    }
});

// I don't think there will be a individual review page in the frontend, though get may still be important for standard entries when updating
reviewRouter.get("/review/:id", async (req, res) => {
    try {
        const review = await Review.findOne({ _id: req.params.id});
        res.status(200).json(review);
    } catch(e) {
        res.status(500).json({message: e});
    }
});

reviewRouter.get("/user/:id", async (req, res) => {
    try {
        const reviews = await Review.find({ ratedUserId: req.params.id});
        res.status(200).json(reviews);
    } catch(e) {
        res.status(500).json({message: e});
    }
})

// update review
reviewRouter.put("/update/:id", async (req, res) => {
    try {
        const user = await User.findOne({uid: req.body.uid});
        if (user._id != req.body.review.posterId) {
            throw "incorrect user identification";
        } else {
            const oldReview = await Review.findById(req.params.id);
            await Review.replaceOne({_id: req.params.id}, req.body.review);

            const difference = req.body.review.stars - oldReview.stars;

            const owner = User.findById(req.ratedUserId);
            const new_user_rating = owner + difference * (1/owner.numberOfRatings);
            await User.findByIdAndUpdate(owner._id, {rating: new_user_rating});
            res.status(200).json({status: "success"});
        }
    } catch(e) {
        res.status(500).json({message: e});
    }
});

reviewRouter.delete("/delete/:id", async (req, res) => {
    try {
        const user = await User.findOne({uid: req.body.uid});
        const review = await Review.findOne({_id: req.params.id});
        if (user._id != review.posterId) {
            throw "incorrect user identification";
        } else {
            await Review.deleteOne({_id: req.params.id});
            res.status(200).json({message: "success"});
        }
    } catch (e) {
        res.status(500).json({message: e});
    }
})

export default reviewRouter;
