import express from "express"

import Review from "../models/Review.js"
//not sure if I need the following
//import User from "../models/User.js"
//import Product from "../models/Product.js"

const reviewRouter = express.Router();

// every route here has the prefix /api/reviews

reviewRouter.post("/create", async (req,res) => {
    try {
        await Review.create(req.body); //maybe we don't need inventory here, I think mongoose may create an empty list automatically
        res.status(200).json({status: "success"});
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

// update review
reviewRouter.put("/update/:id", async (req, res) => {
    try {
        await Review.replaceOne({_id: req.params.id}, req.body);
        res.status(200).json({status: "success"});
    } catch(e) {
        res.status(500).json({message: e});
    }
});

reviewRouter.delete("/delete/:id", async (req, res) => {
    try {
        await User.deleteOne({_id: req.params.id});
        res.status(200).json({message: "success"});
    } catch (e) {
        res.status(500).json({message: e});
    }
})

export default reviewRouter;