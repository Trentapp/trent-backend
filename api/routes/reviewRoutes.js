import express from "express"

import Review from "../models/Review.js"
import User from "../models/User.js";
//not sure if I need the following
//import User from "../models/User.js"
//import Product from "../models/Product.js"

const reviewRouter = express.Router();

// every route here has the prefix /api/reviews

reviewRouter.post("/create", async (req,res) => { //maybe change that so the poster (poster._id) is set automatically based on the uid
    try {
        const user = await User.findOne({uid: req.body.uid});
        if (user._id != req.body.review.poster._id || req.body.review.posterId == req.body.review.ratedUser._id){
            throw "user identification incorrect";
        } else {
            await Review.create(req.body.review);//this is dangerous! An update should only occur if everything works (otherwise it can throw an error and still partially update). Fix that later.
            const owner = await User.findById(req.body.review.ratedUser._id);
            const new_user_rating = (owner.rating * owner.numberOfRatings + req.body.review.stars)/(owner.numberOfRatings + 1);// I hope we don't get rounding errors
            await User.findByIdAndUpdate(owner._id, {rating: new_user_rating, numberOfRatings: (owner.numberOfRatings + 1)});
            res.status(200).json({status: "success"});
        }
    } catch(e) {
        res.status(500).json({message:e});
    }
});

// I don't think there will be a individual review page in the frontend, though get may still be important for standard entries when updating
reviewRouter.get("/review/:id", async (req, res) => {
    try {
        const review = await Review.findOne({ _id: req.params.id}).populate([{path:'ratedUser', model:'Users', select:['name']}, {path:'poster', model:'Users', select:['name']}]);
        res.status(200).json(review);
    } catch(e) {
        res.status(500).json({message: e});
    }
});

reviewRouter.get("/user/:id", async (req, res) => {
    try {
        let reviews = await Review.find({ ratedUserId: req.params.id}).populate([{path:'ratedUser', model:'Users', select:['name']}, {path:'poster', model:'Users', select:['name']}]);
        // for(let i = 0; i < reviews.length; i++) {
        //   // TODO: if that fails just continue
        //   let review = reviews[i];
        //   const poster = await User.findById(review.posterId);
        //   console.log(poster.name);
        //   // review.posterName = poster.name;
        //   review["style"] = "10/10";
        //   console.log(review);
        //   reviews[i] = review;
        // }
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
            const owner = await User.findById(req.body.review.ratedUserId);
            const new_user_rating = owner.rating + difference * (1/owner.numberOfRatings);
            await User.findByIdAndUpdate(owner._id, {rating: new_user_rating});
            res.status(200).json({status: "success"});
        }
    } catch(e) {
        res.status(500).json({message: e});
    }
});

//todo: update user rating on delete Review
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
