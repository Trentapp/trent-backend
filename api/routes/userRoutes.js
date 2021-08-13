import express from "express"
import sharp from "sharp"
import multer from "multer"
import fs from "fs"
import User from "../models/User.js"
import Product from "../models/Product.js"

import MangoPayClient from "../../MangoPayClient.js"
import Logger from "../../Logger.js"

const upload = multer({dest: "../uploads/"});

const userRouter = express.Router();

// every route here has the prefix /api/users

// create user profile
userRouter.post("/create", async (req, res) => {
  Logger.shared.log(`Creating new user`);
    try {
        let user = req.body.user; //I would submit the user data in the request directly, so the new req.body is the old req.body.user
        let newUser = await User.create({ ...user, inventory: [], transactionsLender: [], transactionsBorrower: [], rating: 0, numberOfRatings: 0 }); //maybe we don't need inventory here, I think mongoose may create an empty list automatically
        Logger.shared.log(`Successfully created new user`);
        res.status(200).json(newUser);
    } catch (e) {
      Logger.shared.log(`Creating new user failed`, 1);
        res.status(500).json({ message: e });
    }
});

// get private profile
userRouter.post("/user", async (req, res) => {
  Logger.shared.log(`Getting private user profile`);
    try {
        const user = await User.findOne({ uid: req.body.uid }).populate([{path:'inventory', model:'Product', select:['name', 'prices', 'thumbnail', 'user', 'desc', 'location'], populate: {path: 'user', model: 'User', select:['_id']}}]).orFail();
        Logger.shared.log(`Successfully got private user profile with id ${user._id}`);
        res.status(200).json(user);
    } catch (e) {
        Logger.shared.log(`Failed getting private user profile ${e}`, 1);
        res.status(500).json({ message: e });
    }
});

//get public profile
userRouter.get("/user-profile/:id", async (req, res) => {
  Logger.shared.log(`Getting public user profile with id ${req.params.id}`);
    try {
        const user = await User.findOne({_id: req.params.id}).populate([{path:'inventory', model:'Product', select:['name', 'prices', 'thumbnail', 'desc', 'location']}]).orFail();
        Logger.shared.log(`Succssfully got public user profile with id ${req.params.id}`);
        res.status(200).json({_id: user._id, name: user.name, inventory: user.inventory, rating: user.rating, numberOfRatings: user.numberOfRatings, picture: user.picture});//should address and mail be publicly accessible? No :)
    } catch(e) {
      Logger.shared.log(`Failed getting public user profile with id ${req.params.id}`, 1);
        res.status(500).json({message: e});
    }
});

// get inventory
userRouter.get("/user-inventory/:id", async (req, res) => {
  Logger.shared.log(`Getting inventory of user with id ${req.params.id}`);
    try {
        const user = await User.findOne({_id: req.params.id}).populate([{path:'inventory', model:'Product', select:['name', 'prices', 'thumbnail', 'desc', 'location']}]).orFail();
        Logger.shared.log(`Succssfully got public user profile with id ${req.params.id}`);
        res.status(200).json({_id: user._id, name: user.name, inventory: user.inventory, rating: user.rating, numberOfRatings: user.numberOfRatings, picture: user.picture});//should address and mail be publicly accessible? No :)
    } catch(e) {
      Logger.shared.log(`Failed getting public user profile with id ${req.params.id}`, 1);
        res.status(500).json({message: e});
    }
});

// update user
userRouter.put("/update", async (req, res) => {
    try {
        const updatedUser = req.body.user;

        const user = await User.findOne({ uid: updatedUser.uid });
        Logger.shared.log(`Updating public user profile with id ${user._id}`);

        updatedUser["_id"] = user._id;
        updatedUser["inventory"] = user.inventory;
        updatedUser["transactionsLender"] = user.transactionsLender;
        updatedUser["transactionsBorrower"] = user.transactionsBorrower;
        updatedUser["mail"] = user.mail;
        updatedUser["picture"] = user.picture;

        await User.replaceOne({ uid: req.body.user.uid }, req.body.user);// maybe change to updateOne later
        Logger.shared.log(`Successfully updated user profile with id ${user._id}`);
        res.status(200).json({ status: "success" });
    } catch (e) {
        Logger.shared.log(`Updating user profile failed: ${e}`);
        res.status(500).json({ message: e });
    }
});

userRouter.delete("/delete", async (req, res) => {
  Logger.shared.log(`Deleting public user profile with id ${req.body?.user?._id}`);
    try {
        const user = await User.findOne({ uid: req.body.uid });
        const userId = user._id;
        await Product.deleteMany({ userId: userId });//deletes all products of that user
        await User.deleteOne({ uid: req.body.uid });
        res.status(200).json({ message: "success" });
        Logger.shared.log(`Successfully deleted user profile with id ${req.body?.user?._id}`);
    } catch (e) {
        Logger.shared.log(`Delting user profile with id ${req.body?.user?._id} failed: ${e}`);
        res.status(500).json({ message: e });
    }
});

userRouter.post("/uploadPicture", upload.any(), upload.single("body"), async (req,res) => { //first uploading all images and then one blob product (like json)
  Logger.shared.log(`Uploading new profile picture started`)
    try {
        let body, thumbnail;
        for (const file of req.files){
            if (file.fieldname == "parameters"){
                body = JSON.parse(fs.readFileSync(file.path).toString());
                Logger.shared.log(`Received uid successfully`);
            } else if (file.fieldname == "image"){
                Logger.shared.log(`Received image`);
                thumbnail = await convertPicture(file);
            }
        }
        await User.updateOne({ uid: body.uid }, {picture: thumbnail});
        Logger.shared.log(`Successfully uploaded new profile picture for user`);
        res.status(200).json({status: "success"});
    } catch(e) {
        Logger.shared.log(`Could not upload picture: ${e}`, 1);
        res.status(500).json({message:e});
    }
});

userRouter.post("/deleteProfilePicture", async (req, res) => {
  Logger.shared.log("Deleting profile picture");
  try {
    await User.updateOne({uid : req.body.uid}, {$unset : {picture:""}});
    Logger.shared.log("Successfully delete profile picture");
    res.status(200).json({status: "success"});
  } catch(e) {
    Logger.shared.log(`Could not delete delete profile picture: ${e}`, 1);
    res.status(500).json({message:e});
  }
});

const convertPicture = async (file) => new Promise(resolve => {
  sharp(file.path)
  .metadata()
  .then( info => {
    sharp(file.path)
      .extract({ width: Math.min(info.width, info.height), height: Math.min(info.width, info.height), left: parseInt((info.width - Math.min(info.width, info.height)) / 2), top: parseInt((info.height - Math.min(info.width, info.height)) / 2) })
      .resize({ height:200, width:200})
      .toFile(file.path + "_thumb")
      .then(function(newFileInfo){
          let thumbnail = {data: fs.readFileSync(file.path + "_thumb"), contentType: file.mimetype};
          console.log("image ready");
          resolve(thumbnail);
      })
  })
});

userRouter.post("/addAPNToken", async (req, res) => {
  Logger.shared.log("Adding new APN Token");
    try {
        const user = await User.findOne({ uid: req.body.uid });
        if (!user.apnTokens.includes(req.body.token)) {
          user.apnTokens.push(req.body.token);
        }
        await User.replaceOne({ uid: req.body.uid }, user);
        Logger.shared.log("Successfully set new APN Token");
        res.status(200).json({ status: "success" });
    } catch (e) {
      Logger.shared.log(`Error adding new APN Token: ${e}`);
        res.status(500).json({ message: e });
    }
});

export default userRouter;
