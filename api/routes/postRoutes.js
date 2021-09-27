import express from "express"

import Logger from "../../Logger.js"

import Post from "../models/Post.js"
import User from "../models/User.js"
import {getUsersByTypesAndLocation} from "./userRoutes.js";
import PushNotificationHandler from "../../PushNotificationHandler.js" // pushNotifications are to be implemented!!!
import { transporter, callbackSendMail } from "../mail.js"
import {items} from "./itemRoutes.js";
const postsRouter = express.Router();

// create a post
postsRouter.post("/create", async (req, res) => {
    Logger.shared.log(`Creating new post`);
    try {
        const user = await User.findOne({uid: req.body.uid});
        // for ad-hoc product searches, the user should just pass in a typeId like 9999, so no other id matches with it
        const post = {typeIds: req.body.typeIds, comment: req.body.comment, user: user._id, location: req.body.location, timestamp: new Date(), status: 0};
        let newPost = await Post.create(post);
        let users = await getUsersByTypesAndLocation(req.body.typeIds, req.body.location);
        for (let i = 0; i < users.length; i++) {
            const recipient = users[i];
            if (recipient._id == user._id){
                continue;
            }
            const mailoptions = { // German version
                from: "info@trentapp.com",
                to: recipient.mail,
                subject: `Trent-Anfrage: ${user.name} aus deiner Nähe möchte einen oder mehrere Gegenstände die du hast ausleihen`,
                text: `Hallo ${recipient.name},\n${user.name} benötigt einen oder mehrere Gegenstände und braucht deshalb deine Hilfe. Du bist einer von wenigen Trent-Nutzern (wenn nicht der Einzige) in der Umgebung von ${user.name}, der die Gegenstände, die ${user.name} braucht, besitzt.\n ${user.name} braucht folgende Gegenstände: ${req.body.typeIds.map(tId => items[tId]).join(", ")}\nDazu schreibt er/sie: ${req.body.comment}\nBitte logge dich auf trentapp.com ein und kontaktiere ${user.name}.\nVielen Dank für deine Unterstützung! Menschen wie dir helfen dabei, dass weniger überproduziert wird und weniger Müll erzeugt wird.\nBeste Grüße\nDas Trent Team`, // should we send the email address of the borrower?
            };
            transporter.sendMail(mailoptions, callbackSendMail);
            //TODO: push notifications
        }
        Logger.shared.log(`Successfully created new post`);
        res.status(200).json(newPost);
    } catch (e) {
        Logger.shared.log(`Creating new post failed: ${e}`, 1);
        res.status(500).json({ message: e });
    }
});

// get recent Posts around specific location
// TODO: maybe filter for status:0 (active/open requests)
postsRouter.post("/getAroundLocation", async (req,res) => {
    Logger.shared.log(`Getting posts around location ${req.body?.location}`); //location.coordinates should equal [lng, lat]
    const maxDistance = req.body.maxDistance/6371 ?? 4/6371; //default radius is 4km // you can pass in maxDistance in unit km
    const numPosts = req.body.numPosts ?? 10; // maybe add pagination (with .skip) later to make sth like "Load more" possible
    try {
        let posts = await Post.find({location: {$geoWithin: { $centerSphere: [req.body.location.coordinates, maxDistance]}}}).sort([['timestamp', -1]]).limit(numPosts).populate([{path: 'user', model: 'User', select: ['name', 'mail', 'address', 'location', 'picture']}]);//later optimize to find the nearest (maybe combined with greater geowithin); do it with manual calculations if $near does not work
        Logger.shared.log(`Successfully got posts.`);
        res.status(200).send(posts);// I hope send works as json
    } catch(e){
        Logger.shared.log(`Failed getting posts: ${e}`);
        res.status(500).json({message: e});
    }
});

// get specific post
postsRouter.get("/post/:id", async (req,res) => {
    Logger.shared.log(`Getting post ${req.params.id}}`); //location.coordinates should equal [lng, lat]
    try {
        const post = await Post.findOne({_id: req.params.id});
        Logger.shared.log(`Successfully got post.`);
        res.status(200).send(post);// I hope send works as json
    } catch(e){
        Logger.shared.log(`Failed to get post: ${e}`);
        res.status(500).json({message: e});
    }
});
postsRouter.put("/setStatus/:id", async (req,res) => {
    Logger.shared.log(`Setting status of post ${req.params.id}`);
    try {
        const user = await User.findOne({uid: req.body.uid});
        const post = await Post.findOne({_id: req.params.id}).populate([{path: "user", model: "User", select: []}]);
        if (JSON.stringify(user._id) == JSON.stringify(post.user._id) && [0,1,2].includes(req.body.status)){
            await Post.updateOne({_id: req.params.id}, {status: req.body.status});
        } else {
            throw "User does not have permission, or new status is invalid (not 0,1 or 2)";
        }
        res.status(200).json({message: "success"})
    } catch(e) {
        Logger.shared.log(`Failed to update status: ${e}`);
        res.status(500).json({message: e});
    }
});

// update a post
postsRouter.put("/update/:id", async (req, res) => {
    Logger.shared.log(`Updating post ${req.params.id}`);
    try {
        const user = await User.findOne({uid: req.body.uid});
        const post = await Post.findOne({_id: req.params.id}).populate([{path: "user", model: "User", select: []}]);
        let newPost;
        if (JSON.stringify(post.user._id) == JSON.stringify(user._id)) {
            newPost = await Post.updateOne({_id: req.params.id}, {typeIds: req.body.typeIds, comment: req.body.comment, location: req.body.location, timestamp: new Date()});//should I exclude timestamp?
        } else {
            throw "Permission denied";
        }        
        Logger.shared.log(`Successfully updated post`);
        res.status(200).json(newPost);
    } catch (e) {
        Logger.shared.log(`Updating post failed`, 1);
        res.status(500).json({ message: e });
    }
});

postsRouter.post("/delete/:id", async (req, res) => {
    Logger.shared.log(`Deleting post ${req.params.id}`);
    try {
        const user = await User.findOne({uid: req.body.uid});
        const post = await Post.findOne({_id: req.params.id}).populate([{path: "user", model: "User", select: []}]);
        if (JSON.stringify(user._id) == JSON.stringify(post.user._id)){
            await Post.deleteOne({_id: req.params.id});
        } else {
            throw "Permission denied";
        }
        Logger.shared.log(`Successfully deleted post`);
        res.status(200).json({message: "success"});
    } catch (e) {
        Logger.shared.log(`Deleting post failed`, 1);
        res.status(500).json({ message: e });
    }
})


export default postsRouter;