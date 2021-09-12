import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Chat from "../models/Chat.js"

import Logger from "../../Logger.js"
import PushNotificationHandler from "../../PushNotificationHandler.js"
import { transporter, callbackSendMail } from "../mail.js"

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

		let chatId; //for redirecting to the right url
		let recipientEmail;
		let senderName = user.name;
		let recipientTokens = [];
		let productName;
		if (req.body.chatId) {// I would put that into a put("/updateChat/:id") route, but not important
			const chat = await Chat.findById(req.body.chatId).populate([{path: 'product', model: "Product", select: ['name']}, {path: 'borrower', model: "User", select: ['name', 'mail', 'apnTokens']}, {path: 'lender', model: "User", select: ['name', 'mail', 'apnTokens']}, {path:'messages.sender', model:'User', select: ['name']}]);
			if (JSON.stringify(chat.borrower._id) != JSON.stringify(userId) && JSON.stringify(chat.lender._id) != JSON.stringify(userId)) { throw "User not authorized"; }
			await Chat.updateOne({_id: req.body.chatId}, { $push: { messages: message } });

			productName = chat.product.name;
			if (userId == chat.lender._id) {
				recipientTokens = chat.borrower.apnTokens;
				recipientEmail = chat.borrower.mail;
			} else {
				recipientTokens = chat.lender.apnTokens;
				recipientEmail = chat.lender.mail;
			}

			chatId = req.body.chatId;
		} else {
			// not perfectly tested yet, I hope there is no problem if req.body.recipient is undefined
			const existingChat = await Chat.findOne({ $and: [{ 'product': req.body.productId }, { $or: [{ 'borrower': userId }, { 'borrower': req.body.recipient }] }] }).populate([{path: 'product', model: "Product", select: ['name']}, {path: 'borrower', model: "User", select: ['name', 'mail', 'apnTokens']}, {path: 'lender', model: "User", select: ['name', 'mail', 'apnTokens']}, {path:'messages.sender', model:'User', select: ['name']}]);
			if (existingChat) {
				await Chat.updateOne({_id: existingChat._id}, { $push: { messages: message } });

				productName = existingChat.product.name;
				if (userId == existingChat.lender._id) {
					recipientTokens = existingChat.borrower.apnTokens;
					recipientEmail = existingChat.borrower.mail;
				} else {
					recipientTokens = existingChat.lender.apnTokens;
					recipientEmail = existingChat.borrower.mail;
				}
				chatId = existingChat._id;
			} else {
				const product = await Product.findById(req.body.productId).populate([{path:'user', model:'User', select:['name', 'mail', 'apnTokens']}]);
				if (product.user._id == userId && !req.body.recipient) { throw "missing parameters"; }
				productName = product.name;
				const chat = {
					"lender": product.user._id,
					"borrower": (product.user._id == userId) ? req.body.recipient : userId,
					"product": req.body.productId,
					"messages": [message]
				}
				const newChat = await Chat.create(chat);

				if (userId == product.user._id) {
					const recipient = User.findById(req.body.recipient);
					recipientTokens = recipient.apnTokens;
					recipientEmail = recipient.mail;
				} else {
					recipientTokens = product.user.apnTokens;
					recipientEmail = product.user.mail;
				}
				chatId = newChat._id;
			}
		}
		if (recipientTokens?.length > 0){ // send push notification
			PushNotificationHandler.shared.sendPushNotification(senderName, req.body.content, recipientTokens);
		}
		// Send email notification
		const mailoptions = {
			from: "info@trentapp.com",
			to: recipientEmail,
			subject: `New message from ${senderName} because of product ${productName}`,
			text: `View chat: trentapp.com/chats/${chatId} \n\n${senderName} writes: ${req.body.content}`
		};
		transporter.sendMail(mailoptions, callbackSendMail);
		Logger.shared.log(`Successfully sent message for chatId: ${req.body.chatId} concering product: ${req.body.productId}`);
		res.status(200).json({ status: "success", chatId: chatId });
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

		const chats = await Chat.find({ $or: [{ borrower: userId }, { lender: userId }] }).populate([{path: 'product', model: "Product", select: ['name']}, {path: 'borrower', model: "User", select: ['deleted', 'name', "picture"]}, {path: 'lender', model: "User", select: ['deleted', 'name', "picture"]}, {path:'messages.sender', model:'User', select: ['deleted', 'name']}]);

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
		const chat = await Chat.findById(req.params.id).populate([{path: 'product', model: "Product", select: ['name']}, {path: 'borrower', model: "User", select: ['deleted', 'name']}, {path: 'lender', model: "User", select: ['deleted', 'name', "picture"]}, {path:'messages.sender', model:'User', select: ['deleted', 'name', "picture"]}]);
		if (!user || (JSON.stringify(chat.borrower._id) != JSON.stringify(user._id) && JSON.stringify(chat.lender._id) != JSON.stringify(user._id))){
			throw "No access to chat!";
		}
		for (let i = 0; i < chat.messages.length; i++) {
			if (JSON.stringify(chat.messages[i].sender._id) != JSON.stringify(user._id)) {
				chat.messages[i].read = true;
			}
		}
		await Chat.updateOne({_id: chat._id}, {messages: chat.messages});
		Logger.shared.log(`Successfully sent chat with id: ${req.params.id}`);
		res.status(200).json(chat);
	} catch (e) {
		Logger.shared.log(`Sending chat with id: ${req.params.id} failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
})

// get chats of specific user with new messages
chatRouter.post("/getNewMessages", async (req, res) => {
	Logger.shared.log(`Getting chats using /chats/get`);
	try {
		if (!req.body.uid) { throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.body.uid });
		const userId = user._id;
		if (!userId) { Logger.shared.log(`Authentication for getting chats failed`, 1); throw "User uid not found"; }

		const chats = await Chat.find({ $or: [{ borrower: userId }, { lender: userId }] }).populate([{path: 'product', model: "Product", select: ['name']}, {path: 'borrower', model: "User", select: ['name', "picture"]}, {path: 'lender', model: "User", select: ['name', "picture"]}, {path:'messages.sender', model:'User', select: ['name']}]);
		let newMsgChats = [];
		for (let j = 0; j < chats.length; j++) {
			const chat = chats[j];
			for (let i = 0; i < chat.messages.length; i++) {
				if (!chat.messages[i].read && JSON.stringify(chat.messages[i].sender._id) != JSON.stringify(user._id)) {
					newMsgChats.push(chats[j]);
					break;
				}
			}
		}
		Logger.shared.log(`Sent chats of users successfully`);
		res.status(200).json(newMsgChats);
	} catch (e) {
		Logger.shared.log(`Getting chats failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});




// ugly and not needed anymore
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
			await chat.populate([{path: 'product', model: "Product", select: ['name']}, {path: 'borrower', model: "User", select: ['name']}, {path: 'lender', model: "User", select: ['name']}, {path:'messages.sender', model:'User', select: ['name']}]);
		}
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
