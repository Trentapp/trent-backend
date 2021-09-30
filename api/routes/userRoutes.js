import express from "express"
import sharp from "sharp"
import multer from "multer"
import NodeGeocoder from "node-geocoder"
import fs from "fs"
import User from "../models/User.js"
import Item from "../models/Item.js"

import MangoPayClient from "../../MangoPayClient.js"
import Logger from "../../Logger.js"

const options = {
  provider: "google",
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
};
const geocoder = NodeGeocoder(options);

const upload = multer({dest: "../uploads/"});

const userRouter = express.Router();

// every route here has the prefix /api/users

// create user profile
userRouter.post("/create", async (req, res) => {
  Logger.shared.log(`Creating new user`);
    try {
        let user = req.body.user; //I would submit the user data in the request directly, so the new req.body is the old req.body.user
        let newUser = await User.create({ ...user, items: [], transactionsLender: [], transactionsBorrower: [], rating: 0, numberOfRatings: 0 }); //maybe we don't need inventory here, I think mongoose may create an empty list automatically
        Logger.shared.log(`Successfully created new user`);
        res.status(200).json(newUser);
    } catch (e) {
      Logger.shared.log(`Creating new user failed`, 1);
        res.status(500).json({ message: e });
    }
});

const getCoordinates = async (user) => {
  //extract the geocoordinates from address and add it to user
  try {
      const responseLoc = await geocoder.geocode(`${user.address.streetWithNr}, ${user.address.zipcode} ${user.address.city}, ${user.address.country}`); //may not need to be that detailed
      user['location.coordinates'] = [responseLoc[0].longitude, responseLoc[0].latitude];
      user['location.type'] = "Point";
      return user;
  } catch (e) {
      Logger.shared.log(`Getting coordinates for user failed: ${e}`, 1)
  }
};

// get private profile
userRouter.post("/user", async (req, res) => {
  Logger.shared.log(`Getting private user profile`);
    try {
        const user = await User.findOne({ uid: req.body.uid }).populate([{path:'items', model:'Item', select:["typeId", "typeName"]}]);
        if (user) {
          Logger.shared.log(`Successfully got private user profile with id ${user._id}`);
        } else {
          Logger.shared.log(`Could not find user with that uid`);
        }
        res.status(200).json(user);
    } catch (e) {
        Logger.shared.log(`Failed getting private user profile ${e}`, 1);
        res.status(500).json({ message: e });
    }
});

// update items (new update inventory) (also for setting items (inventory))
userRouter.post("/updateItems", async (req,res) => {
    Logger.shared.log("Update user items (the new inventory)");
    try {
        const user = await User.findOne({ uid: req.body.uid }).populate([{path:'items', model:'Item', select:["typeId", "typeName"]}]);
        if (!user.location.coordinates || user.location.coordinates == []){
          throw "You need to enter your address first!";
        }
        let newTypeIds = req.body.typeIdList;//typeIdList includes exactly ALL items a user has
        let toRemove = [];
        let existingTypeIds = [];
        let newItemIds = [];
        console.log("user items: ", user.items);
        for (let item of user.items) {
            existingTypeIds.push(item.typeId);
            if (!newTypeIds.includes(item.typeId)){
                toRemove.push(item._id);
            } else {
                newItemIds.push(item._id);
            }
        }
        console.log(existingTypeIds, newTypeIds)
        newTypeIds = newTypeIds.filter(typeId => !(existingTypeIds.includes(typeId)));
        console.log(newTypeIds)
        //delete those in toRemove
        await Item.deleteMany({_id: {$in: toRemove}});
        //create newTypeIds
        const itemsToCreate = newTypeIds.map((tId) => {return {typeId: tId, location: user.location, user: user._id}});
        console.log(itemsToCreate);
        let newItems = await Item.create(itemsToCreate);
        //update user.items
        if (newItems){
          for (let i = 0; i < newItems.length; i++){
              newItemIds.push(newItems[i]._id);
          }
        }
        await User.updateOne({_id: user._id}, {items: newItemIds});
        res.status(200).json(newItemIds);
        Logger.shared.log(`Items of user updated successfully!`);
    } catch(e) {
        Logger.shared.log(`ERROR in updating items: ${e}`);
        res.status(500).json({message: e});
    }
})

// update user
userRouter.put("/update", async (req, res) => {
    try {
        let updatedUser = req.body.user;

        const user = await User.findOne({ uid: updatedUser.uid });
        Logger.shared.log(`Updating public user profile with id ${user._id}`);

        updatedUser["_id"] = user._id;
        updatedUser["inventory"] = user.inventory;
        updatedUser["transactionsLender"] = user.transactionsLender;
        updatedUser["transactionsBorrower"] = user.transactionsBorrower;
        updatedUser["mail"] = user.mail;
        updatedUser["picture"] = user.picture;

        if (updatedUser.firstName && updatedUser.lastName) {
          updatedUser["name"] = updatedUser.firstName + " " + updatedUser.lastName;
        }
        if (updatedUser.address?.streetWithNr && updatedUser.address?.zipcode) {
          updatedUser = await getCoordinates(updatedUser);
        }

        await User.replaceOne({ uid: req.body.user.uid }, updatedUser);// maybe change to updateOne later
        Logger.shared.log(`Successfully updated user profile with id ${user._id}`);
        res.status(200).json({ status: "success" });
    } catch (e) {
        Logger.shared.log(`Updating user profile failed: ${e}`);
        res.status(500).json({ message: e });
    }
});

userRouter.post("/delete", async (req, res) => { // does not really delete user, just empties inventory sets deleted attribute
  Logger.shared.log(`Deleting public user profile`);
    try {
        const user = await User.findOne({ uid: req.body.uid });
        await Item.deleteMany({user: user._id});//not tested, but should work
        await User.updateOne({_id: user._id}, {deleted: true, items: []});
        res.status(200).json({ message: "success" });
        Logger.shared.log(`Successfully deleted user profile with id ${user._id}`);
    } catch (e) {
        Logger.shared.log(`Delting user failed: ${e}`);
        res.status(500).json({ message: e });
    }
});

userRouter.post("/uploadPicture", upload.any(), upload.single("body"), async (req,res) => {
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

// get users to send pushnotifications to (by surrounding area and typeIds)
export const getUsersByTypesAndLocation = async (typeIds, location, maxDist=4) => {
  Logger.shared.log(`Getting users with items of typeIds ${typeIds} around location ${location}`); //location.coordinates should equal [lng, lat]
  const maxDistance = maxDist/6371 ?? 4/6371; //default radius is 4km // you can pass in maxDistance in unit km
  try {
      typeIds = typeIds.filter(tId => tId != 9999);//"Sonstige" should obviously not be required
      if (typeIds.length == 0){
        return [];//otherwise it would write everyone
      }
      let users = await User.find({location: {$geoWithin: { $centerSphere: [location.coordinates, maxDistance]}}}).populate([{path: "items", model: "Item", select: ["typeId"]}]); //later optimize to find the nearest (maybe combined with greater geowithin); do it with manual calculations if $near does not work
      users = users.filter(u => typeIds.every(tId => u.items.map(it => it.typeId).includes(tId)));
      Logger.shared.log(`Successfully got users.`);
      return users;
  } catch(e){
      Logger.shared.log(`Failed getting users: ${e}`);
      return {message: e};
  }
}
userRouter.post("/getByTypesAndLocation", (req,res) => res.send(getUsersByTypesAndLocation(req.body.typeIds, req.body.location))); // not sure if that works, at least the status code is probably wrong, but actually the request is not really needed (rather testing purposes)


export default userRouter;
