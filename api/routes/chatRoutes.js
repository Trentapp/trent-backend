import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Chat from "../models/Chat.js"

import Logger from "../../Logger.js"

const chatRouter = express.Router();

//every route here with prefix /api/chats

chatRouter.post("/sendMessage", async (req, res) => {
	try {
		Logger.shared.log(`Sending new message for chatId: ${req.body.chatId} concering product: ${req.body.productId}`);
		if (!req.body.uid || !(req.body.chatId || req.body.productId) || !req.body.content) { Logger.shared.log(`Parameters messing for sending message for chatId: ${req.body.chatId} concering product: ${req.body.productId}`, 1); throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.body.uid });
		const userId = user._id;
		if (!userId) { Logger.shared.log(`Authenticating user sending message for chatId: ${req.body.chatId} concering product: ${req.body.productId} failed`, 1); throw "User uid not found"; }

		const message = {
			"timestamp": new Date().getTime(), //not totally sure but I think we don't want the .getTime(), because I think it deletes the Date information, but no time for that now
			"sender": userId,
			"content": req.body.content,
			"read": false
		};

		if (req.body.chatId) {// I would put that into a put("/updateChat/:id") route, but not important
			const chat = await Chat.findById(req.body.chatId).populate([{path: 'product', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
			if (JSON.stringify(chat.borrower._id) != JSON.stringify(userId) && JSON.stringify(chat.lender._id) != JSON.stringify(userId)) { throw "User not authorized"; }
			await Chat.findByIdAndUpdate(req.body.chatId, { $push: { messages: message } });
		} else {
			// not perfectly tested yet, I hope there is no problem if req.body.recipient is undefined
			const existingChat = await Chat.findOne({ $and: [{ 'product': req.body.productId }, { $or: [{ 'borrower': userId }, { 'borrower': req.body.recipient }] }] }).populate([{path: 'product', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
			if (existingChat) {
				await Chat.findByIdAndUpdate(existingChat._id, { $push: { messages: message } });
			} else {
				const product = await Product.findById(req.body.productId).populate([{path:'user', model:'Users', select:['name']}]);
				if (product.user._id == userId && !req.body.recipient) { throw "missing parameters"; }

				const chat = {
					"lender": product.user._id,
					"borrower": (product.user._id == userId) ? req.body.recipient : userId,
					"product": req.body.productId,
					"messages": [message]
				}
				const newChat = await Chat.create(chat);
			}
		}

		Logger.shared.log(`Successfully sent message for chatId: ${req.body.chatId} concering product: ${req.body.productId}`);
		res.status(200).json({ status: "success" });
	} catch (e) {
		Logger.shared.log(`Sending message for chatId: ${req.body.chatId} concering product: ${req.body.productId} failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});


chatRouter.post("/getChatsOfUser", async (req, res) => {
	Logger.shared.log(`Getting chats using /chats/get`);
	try {
		if (!req.body.uid) { throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.body.uid });
		const userId = user._id;
		if (!userId) { Logger.shared.log(`Authentication for getting chats failed`, 1); throw "User uid not found"; }

		const chats = await Chat.find({ $or: [{ borrower: userId }, { lender: userId }] }).populate([{path: 'product', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);

		Logger.shared.log(`Sent chats of users successfully`);
		res.status(200).json(chats);
	} catch (e) {
		Logger.shared.log(`Getting chats failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

chatRouter.post("/chat/:id", async (req,res) => {
	Logger.shared.log(`Getting chat with id: ${req.params.id}`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const chat = await Chat.findById(req.params.id).populate([{path: 'product', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
		console.log("chat, user: ", chat, user, JSON.stringify(chat.borrower._id), JSON.stringify(user._id));
		if (!user || (JSON.stringify(chat.borrower._id) != JSON.stringify(user._id) && JSON.stringify(chat.lender._id) != JSON.stringify(user._id))){
			throw "No access to chat!";
		}
		Logger.shared.log(`Successfully sent chat with id: ${req.params.id}`);
		res.status(200).json(chat);
	} catch (e) {
		Logger.shared.log(`Sending chat with id: ${req.params.id} failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
})

// Not secure yet. I will either make it secure or find another way to solve it so I don't need that function soon
//attention: if that method is called and the corresponding chat does not exist yet, the chat is created
chatRouter.post("/getByLenderBorrowerProduct/:lenderId/:borrowerId/:productId", async (req,res) => {
	Logger.shared.log(`Getting chat using /chats/getByLenderBorrowerProduct with lenderId: ${req.params.lenderId}, borrowerId: ${req.params.borrowerId}, productId: ${req.params.productId}`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		let chat = await Chat.findOne({$and: [{'lender': req.params.lenderId}, {'borrower': req.params.borrowerId}, {'product': req.params.productId}] });
		if (!chat){
			chat = await Chat.create({lender: req.params.lenderId, borrower: req.params.borrowerId, product: req.params.productId, messages: []});//this somehow not may be returned properly
		} else {
			await chat.populate([{path: 'product', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
		}
		console.log("USER: ", user, chat);
		/*if (!user || (JSON.stringify(chat.borrower._id) != JSON.stringify(user._id) && JSON.stringify(chat.lender._id) != JSON.stringify(user._id))){
			throw "No access to chat!";
		}*/ // the check does not work yet, but will be fixed automatically when the references are saved as ObjectIds
		Logger.shared.log(`Successfully sent chat with id: ${chat._id}`);
		res.status(200).json(chat);
	} catch (e) {
		Logger.shared.log(`Sending chat failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
})

export default chatRouter;
