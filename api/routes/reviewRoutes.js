import express from "express"

import Review from "../models/Review.js"
import User from "../models/User.js";

import Logger from "../../Logger.js"
//not sure if I need the following
//import User from "../models/User.js"
//import Product from "../models/Product.js"

const reviewRouter = express.Router();

// every route here has the prefix /api/reviews

reviewRouter.post("/create", async (req,res) => { //maybe change that so the poster (poster._id) is set automatically based on the uid
    try {
        Logger.shared.log(`Creating review ${req.body.review}`);
        const user = await User.findOne({uid: req.body.uid});
        if (user._id != req.body.review.poster._id || req.body.review.posterId == req.body.review.ratedUser._id){
            Logger.shared.log(`Authenticating user with review failed: ${req.body.review}`, 1);
            throw "user identification incorrect";
        } else {
            const newReview = await Review.create(req.body.review);//this is dangerous! An update should only occur if everything works (otherwise it can throw an error and still partially update). Fix that later.
            Logger.shared.log(`Successfully created review ${newReview}`);
            const owner = await User.findById(req.body.review.ratedUser._id);
            const newUserRating = (owner.rating * owner.numberOfRatings + req.body.review.stars)/(owner.numberOfRatings + 1);// I hope we don't get rounding errors
            await User.findByIdAndUpdate(owner._id, {rating: newUserRating, numberOfRatings: (owner.numberOfRatings + 1)});
            Logger.shared.log(`Successfully updated reviewed User`);
            res.status(200).json({status: "success"});
        }
    } catch(e) {
        Logger.shared.log(`Creating review or updating owner failed: ${e}`, 1);
        res.status(500).json({message:e});
    }
});

// I don't think there will be a individual review page in the frontend, though get may still be important for standard entries when updating
reviewRouter.get("/review/:id", async (req, res) => {
    try {
        Logger.shared.log(`Requesting review with id ${req.params.id}`);
        const review = await Review.findOne({ _id: req.params.id}).populate([{path:'ratedUser', model:'Users', select:['name']}, {path:'poster', model:'Users', select:['name']}]);
        Logger.shared.log(`Successfully sent review with id ${req.params.id}`);
        res.status(200).json(review);
    } catch(e) {
        Logger.shared.log(`Sending review with id ${req.params.id}`, 1);
        res.status(500).json({message: e});
    }
});

reviewRouter.get("/user/:id", async (req, res) => {
    try {
        Logger.shared.log(`Requesting reviews of user with id ${req.params.id}`);
        let reviews = await Review.find({ ratedUserId: req.params.id}).populate([{path:'ratedUser', model:'Users', select:['name']}, {path:'poster', model:'Users', select:['name']}]);
        Logger.shared.log(`Successfully sent reviews of user with id ${req.params.id}`);
        res.status(200).json(reviews);
    } catch(e) {
        Logger.shared.log(`Sending reviews of user with id ${req.params.id} failed`, 1);
        res.status(500).json({message: e});
    }
})

// update review
reviewRouter.put("/update/:id", async (req, res) => {
    try {
        Logger.shared.log(`Updating review with id ${req.params.id}`);
        const user = await User.findOne({uid: req.body.uid});
        if (user._id != req.body.review.posterId) {
            Logger.shared.log(`Authentication for user updating review with id ${req.params.id} failed`, 1);
            throw "incorrect user identification";
        } else {
            const oldReview = await Review.findById(req.params.id);
            await Review.replaceOne({_id: req.params.id}, req.body.review);
            const difference = req.body.review.stars - oldReview.stars;
            const owner = await User.findById(req.body.review.ratedUserId);
            const newUserRating = owner.rating + difference * (1/owner.numberOfRatings);
            await User.findByIdAndUpdate(owner._id, {rating: newUserRating});
            res.status(200).json({status: "success"});
            Logger.shared.log(`Successfully updated review with id ${req.params.id}`);
        }
    } catch(e) {
        Logger.shared.log(`Updating review with id ${req.params.id} failed: ${e}`, 1);
        res.status(500).json({message: e});
    }
});

//todo: update user rating on delete Review
reviewRouter.delete("/delete/:id", async (req, res) => {
    try {
        Logger.shared.log(`Deleting review with id ${req.params.id}`);
        const user = await User.findOne({uid: req.body.uid});
        const review = await Review.findOne({_id: req.params.id});
        if (user._id != review.posterId) {
            Logger.shared.log(`Authentication for user delting review with id ${req.params.id} failed`, 1);
            throw "incorrect user identification";
        } else {
            await Review.deleteOne({_id: req.params.id});
            Logger.shared.log(`Successfully deleted review with id ${req.params.id}`);
            res.status(200).json({message: "success"});
        }
    } catch (e) {
        Logger.shared.log(`Deleted review with id ${req.params.id} failed: ${e}`, 1);
        res.status(500).json({message: e});
    }
})

export default reviewRouter;
