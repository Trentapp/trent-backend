import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"

import Logger from "../../Logger.js"

const userRouter = express.Router();

// every route here has the prefix /api/users

// create user profile
userRouter.post("/create", async (req, res) => {
  Logger.shared.log(`Creating new user`);
    try {
        let user = req.body.user; //I would submit the user data in the request directly, so the new req.body is the old req.body.user
        await User.create({ ...user, inventory: [], transactionsLender: [], transactionsBorrower: [], rating: 0, numberOfRatings: 0 }); //maybe we don't need inventory here, I think mongoose may create an empty list automatically
        Logger.shared.log(`Successfully created new user`);
        res.status(200).json({ status: "success" });
    } catch (e) {
      Logger.shared.log(`Creating new user failed`, 1);
        res.status(500).json({ message: e });
    }
});

// get private profile
userRouter.post("/user", async (req, res) => {
  Logger.shared.log(`Getting private user profile`);
    try {
        const user = await User.findOne({ uid: req.body.uid }).orFail();
        Logger.shared.log(`Successfully got private user profile with id ${user._id}`);
        res.status(200).json(user);
    } catch (e) {
        Logger.shared.log(`Failed getting private user profile`, 1);
        res.status(500).json({ message: e });
    }
});

//get public profile
userRouter.get("/user-profile/:id", async (req, res) => {
  Logger.shared.log(`Getting public user profile with id ${req.params.id}`);
    try {
        const user = await User.findOne({_id: req.params.id}).orFail();
        Logger.shared.log(`Succssfully got public user profile with id ${req.params.id}`);
        res.status(200).json({_id: user._id, name: user.name, inventory: user.inventory, rating: user.rating, numberOfRatings: user.numberOfRatings});//should address and mail be publicly accessible? No :)
    } catch(e) {
      Logger.shared.log(`Failed getting public user profile with id ${req.params.id}`, 1);
        res.status(500).json({message: e});
    }
})

// update user
userRouter.put("/update", async (req, res) => {
  Logger.shared.log(`Getting public user profile with id ${req.body.user._id}`);
    try {
        const updatedUser = req.body.user;

        const user = await User.findOne({ uid: updatedUser.uid });

        updatedUser["_id"] = user._id;
        updatedUser["inventory"] = user.inventory;
        updatedUser["transactionsLender"] = user.transactionsLender;
        updatedUser["transactionsBorrower"] = user.transactionsBorrower;
        updatedUser["mail"] = user.mail;

        await User.replaceOne({ uid: req.body.user.uid }, req.body.user);// maybe change to updateOne later
        Logger.shared.log(`Successfully updated user profile with id ${req.body.user._id}`);
        res.status(200).json({ status: "success" });
    } catch (e) {
        Logger.shared.log(`Updating user profile with id ${req.body.user._id} failed: ${e}`);
        res.status(500).json({ message: e });
    }
});

userRouter.delete("/delete", async (req, res) => {
  Logger.shared.log(`Deleting public user profile with id ${req.body.user._id}`);
    try {
        const user = await User.findOne({ uid: req.body.uid });
        const userId = user._id;
        await Product.deleteMany({ userId: userId });//deletes all products of that user
        await User.deleteOne({ uid: req.body.uid });
        res.status(200).json({ message: "success" });
        Logger.shared.log(`Successfully deleted user profile with id ${req.body.user._id}`);
    } catch (e) {
        Logger.shared.log(`Delting user profile with id ${req.body.user._id} failed: ${e}`);
        res.status(500).json({ message: e });
    }
})

export default userRouter;
