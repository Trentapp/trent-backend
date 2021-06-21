import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"

const userRouter = express.Router();

// every route here has the prefix /api/users

// create user profile
userRouter.post("/create", async (req,res) => {
    try {
        let user = req.body.user; //I would submit the user data in the request directly, so the new req.body is the old req.body.user
        const newUser = await User.create({...user, inventory: []}); //maybe we don't need inventory here, I think mongoose may create an empty list automatically
        res.status(200).json({status: "success"});
    } catch(e) {
        res.status(500).json({message:e});
    }
});

// get private profile
userRouter.get("/user/:id", async (req, res) => {
  try {
      const user = await User.findOne({ uid: req.params.id}).orFail();
      res.status(200).json(user);
  } catch(e) {
      res.status(500).json({message: e});
  }
});

// update user
userRouter.put("/update/:uid", async (req, res) => {
    try {
        await User.replaceOne({uid: req.params.uid}, req.body);
        res.status(200).json({status: "success"});
    } catch(e) {
        res.status(500).json({message: e});
    }
});

userRouter.delete("/delete/:uid", async (req, res) => {
    try {
        await Product.deleteMany({uid: req.params.uid});//deletes all products of that user
        await User.deleteOne({uid: req.params.uid});
        res.status(200).json({message: "success"});
    } catch (e) {
        res.status(500).json({message: e});
    }
})

export default userRouter;