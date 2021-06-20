import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"

const userRouter = express.Router();

// every route here has the prefix /api/users

// create user profile
userRouter.post("/create", async (req,res) => {
    try {
        let user = req.body.user; //I would submit the user data in the request directly, so the new req.body is the old req.body.user
        const newUser = await User.create({...user, inventory: [], transactions_lender: [], transactions_borrower: []}); //maybe we don't need inventory here, I think mongoose may create an empty list automatically
        res.status(200).json({status: "success"});
    } catch(e) {
        res.status(500).json({message:e});
    }
});

// get private profile
userRouter.get("/user/:id", async (req, res) => {
  try {
      const user = await User.findOne({uid: req.params.id});
      res.status(200).json(user);
  } catch(e) {
      res.status(500).json({message: e});
  }
});

// update user
userRouter.put("/update", async (req, res) => {
    try {
      const updatedUser = req.body.user;

      const user = await User.findOne({uid: updatedUser.uid});

      updatedUser["_id"] = user._id;
      updatedUser["inventory"] = user.inventory;
      updatedUser["transactions_lender"] = user.transactions_lender;
      updatedUser["transactions_borrower"] = user.transactions_borrower;
      updatedUser["mail"] = user.mail;

      await User.replaceOne({uid: req.body.user.uid}, req.body.user);
      res.status(200).json({status: "success"});
    } catch(e) {
      res.status(500).json({message: e});
    }
});

userRouter.delete("/delete", async (req, res) => {
    try {
        const user = await User.findOne({uid: req.body.uid});
        const user_id = user._id;
        await Product.deleteMany({user_id: user_id});//deletes all products of that user
        await User.deleteOne({uid: req.body.uid});
        res.status(200).json({message: "success"});
    } catch (e) {
        res.status(500).json({message: e});
    }
})

export default userRouter;
