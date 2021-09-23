import express from "express"

import Logger from "../../Logger.js"

import Post from "../models/Post.js"
import User from "../models/User.js"
import Item from "../models/Item.js"
// import User from "../models/User.js"

const postsRouter = express.Router();

// create a post
postsRouter.post("/create", async (req, res) => {
    Logger.shared.log(`Creating new post`);
    try {
        const user = await User.findOne({uid: req.body.uid});
        // for ad-hoc product searches, the user should just pass in a typeId like 9999, so no other id matches with it
        const post = {typeIds: req.body.typeIds, comment: req.body.comment, user: user._id, location: req.body.location, timestamp: new Date(), status: 0};
        let newPost = await Post.create(post);
        Logger.shared.log(`Successfully created new post`);
        res.status(200).json(newPost);
    } catch (e) {
        Logger.shared.log(`Creating new post failed`, 1);
        res.status(500).json({ message: e });
    }
});

// get recent Posts around specific location
// TODO: get the most recent X posts
postsRouter.post("/getAroundLocation", async (req,res) => {
    Logger.shared.log(`Getting posts around location ${req.body?.location}`); //location.coordinates should equal [lng, lat]
    const maxDistance = req.body.maxDistance/6371 ?? 4/6371; //default radius is 4km // you can pass in maxDistance in unit km
    try {
        const posts = await Post.find({location: {$geoWithin: { $centerSphere: [req.body.location.coordinates, maxDistance]}}}).populate([{path: 'user', model: 'User', select: ['name', 'mail', 'address', 'location']}]);// maybe populate picture later, though I may not be able to send it as JSON //later optimize to find the nearest (maybe combined with greater geowithin); do it with manual calculations if $near does not work
        Logger.shared.log(`Successfully got posts.`);
        res.status(200).json(posts);
    } catch(e){
        Logger.shared.log(`Failed getting posts: ${e}`);
        res.status(500).json({message: e});
    }
});


export default postsRouter;