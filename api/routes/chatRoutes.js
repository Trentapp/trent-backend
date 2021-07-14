import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Chat from "../models/Chat.js"

import Logger from "../../Logger.js"

const chatRouter = express.Router();

//every route here with prefix /api/chats

chatRouter.post("/sendMessage", async (req, res) => {
	try {
		Logger.shared.log(`Sending new message for chatId: ${req.body.chatId} concering item: ${req.body.itemId}`);
		if (!req.body.uid || !(req.body.chatId || req.body.itemId) || !req.body.content) { Logger.shared.log(`Parameters messing for sending message for chatId: ${req.body.chatId} concering item: ${req.body.itemId}`, 1); throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.body.uid });
		const userId = user._id;
		if (!userId) { Logger.shared.log(`Authenticating user sending message for chatId: ${req.body.chatId} concering item: ${req.body.itemId} failed`, 1); throw "User uid not found"; }

		const message = {
			"timestamp": new Date().getTime(), //not totally sure but I think we don't want the .getTime(), because I think it deletes the Date information, but no time for that now
			"sender": userId,
			"content": req.body.content,
			"read": false
		};

		if (req.body.chatId) {// I would put that into a put("/updateChat/:id") route, but not important
			const chat = await Chat.findById(req.body.chatId).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
			if (JSON.stringify(chat.borrower._id) != JSON.stringify(userId) && JSON.stringify(chat.lender._id) != JSON.stringify(userId)) { throw "User not authorized"; }
			await Chat.findByIdAndUpdate(req.body.chatId, { $push: { messages: message } });
		} else {
			// not perfectly tested yet, I hope there is no problem if req.body.recipient is undefined
			const existingChat = await Chat.findOne({ $and: [{ 'item': req.body.itemId }, { $or: [{ 'borrower': userId }, { 'borrower': req.body.recipient }] }] }).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
			if (existingChat) {
				await Chat.findByIdAndUpdate(existingChat._id, { $push: { messages: message } });
			} else {
				const product = await Product.findById(req.body.itemId).populate([{path:'user', model:'Users', select:['name']}]);
				if (product.user._id == userId && !req.body.recipient) { throw "missing parameters"; }

				const chat = {
					"lender": product.user._id,
					"borrower": (product.user._id == userId) ? req.body.recipient : userId,
					"item": req.body.itemId,
					"messages": [message]
				}
				const newChat = await Chat.create(chat);
			}
		}

		Logger.shared.log(`Successfully sent message for chatId: ${req.body.chatId} concering item: ${req.body.itemId}`);
		res.status(200).json({ status: "success" });
	} catch (e) {
		Logger.shared.log(`Sending message for chatId: ${req.body.chatId} concering item: ${req.body.itemId} failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});


// can we delete that function, or are you still using it?
// get should definitely be implemented as http GET request. We can put the uid into the route (/get/:uid) (I think it is not dangerous if you thought that)
chatRouter.post("/get", async (req, res) => {
	Logger.shared.log(`Getting chats using /chats/get`);
	try {
		console.log("body passed into /chats/get : ", req.body);
		if (!req.body.uid) { throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.body.uid });
		const userId = user._id;
		if (!userId) { Logger.shared.log(`Authentication for getting chats failed`, 1); throw "User uid not found"; }

		const chats = await Chat.find({ $or: [{ borrower: userId }, { lender: userId }] }).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);

		Logger.shared.log(`Sent chats of users successfully`);
		res.status(200).json(chats);
	} catch (e) {
		Logger.shared.log(`Getting chats failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

chatRouter.get("/chatsOfUser/:uid", async (req,res) => {
	Logger.shared.log(`Getting chats using /chats/chatsOfUser`);
	try {
		if (!req.params.uid) { throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.params.uid });
		const userId = user._id;
		if (!userId) { Logger.shared.log(`Authentication for getting chats failed`, 1); throw "User uid not found"; }

		const chats = await Chat.find({ $or: [{ borrower: userId }, { lender: userId }] }).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);

		Logger.shared.log(`Sent chats of users successfully`);
		res.status(200).json(chats);
	} catch (e) {
		Logger.shared.log(`Getting chats failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

chatRouter.get("/chat/:id", async (req,res) => {
	// TODO: Usinf uid?
	Logger.shared.log(`Getting chat with id: ${req.params.id}`);
	try {
		const chat = await Chat.findById(req.params.id).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
		Logger.shared.log(`Successfully sent chat with id: ${req.params.id}`);
		res.status(200).json(chat);
	} catch (e) {
		Logger.shared.log(`Sending chat with id: ${req.params.id} failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
})

//attention: if that method is called and the corresponding chat does not exist yet, the chat is created
chatRouter.get("/getByLenderBorrowerProduct/:lenderId/:borrowerId/:productId", async (req,res) => {
	Logger.shared.log(`Getting chat using /chats/getByLenderBorrowerProduct with lenderId: ${lenderId}, borrowerId: ${borrowerId}, productId: ${productId}`);
	try {
		let chat = await Chat.findOne({$and: [{'lender': req.params.lenderId}, {'borrower': req.params.borrowerId}, {'item': req.params.productId}] });
		if (!chat){
			chat = await Chat.create({lender: req.params.lenderId, borrower: req.params.borrowerId, item: req.params.productId, messages: []});//this somehow not may be returned properly
		} else {
			await chat.populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
		}
		Logger.shared.log(`Successfully sent chat with id: ${id}`);
		res.status(200).json(chat);
	} catch (e) {
		Logger.shared.log(`Sending chat failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
})

export default chatRouter;
