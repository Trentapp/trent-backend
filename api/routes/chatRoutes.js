import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Chat from "../models/Chat.js"

const chatRouter = express.Router();


chatRouter.post("/sendMessage", async (req,res) => {
    try {
				if (!req.body.user_uid || !(req.body.chat_id || req.body.item_id) || !req.body.content) { throw "Missing parameters"; }

        const user_result = await User.find({uid: req.body.user_uid});
        const user = user_result[0];
        const user_id = user._id;
        if(!user_id) { throw "User uid not found"; }

				const message = {
					"timestamp" : new Date().getTime(),
					"sender" : user._id,
					"content" : req.body.content,
					"read" : false
				};

				if (req.body.chat_id){
					const chat = await Chat.findById(req.body.chat_id);
					if(chat.borrower != user_id && chat.lender != user_id) { throw "User not authorized"; }

					await Chat.findByIdAndUpdate(req.body.chat_id, {$push: {messages: message}});
				} else {
					const existingChat = await Chat.findOne({$and: [{item_id: req.body.item_id}, {$or: [{borrower: user_id},{lender: user_id}]}]});
					if (existingChat){
						existingChat.messages.push(message);
						existingChat.save();
					} else {
						const product = await Product.findById(req.body.item_id);
						if(product.user_id == user_id && !req.body.recipient) { throw "missing parameters"; }

						const chat = {
							"lender": product.user_id,
							"borrower": (product.user_id == user_id) ? req.body.recipient : user_id,
							"item_id": req.body.item_id,
							"messages":[message]
						}

						const newChat = await Chat.create(chat);
					}
				}


        res.status(200).json({status: "success"});
    } catch(e) {
        res.status(500).json({message:e});
    }
});

chatRouter.post("/get", async (req, res) => {
    try {
				console.log(req.body);
				if(!req.body.uid) { throw "Missing parameters"; }

				const user = await User.findOne({uid: req.body.uid});
        const user_id = user._id;
        if(!user_id) { throw "User uid not found"; }

				const chats = await Chat.find({$or: [{borrower: user_id}, {lender: user_id}]});

        res.status(200).json(chats);
    } catch (e) {
        res.status(500).json({ message: e });
    }
});


export default chatRouter;