import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Chat from "../models/Chat.js"

import Logger from "../../Logger.js"
import PushNotificationHandler from "../../PushNotificationHandler.js"
import { transporter, callbackSendMail } from "../mail.js"

const chatRouter = express.Router();

//every route here with prefix /api/chats

// sendmessage was completely changed, you now only need uid, recipientId, and content
chatRouter.post("/sendMessage", async (req, res) => {
	try {
		Logger.shared.log(`Sending new message from ${req.body.senderId} to ${req.body.recipientId}`);
		if (!req.body.uid || !req.body.recipientId || !req.body.content) { Logger.shared.log(`Parameters messing for sending message for chatId: ${req.body.chatId} concering product: ${req.body.productId}`, 1); throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.body.uid });
		if (!user?._id) { Logger.shared.log(`Authenticating user sending message failed`, 1); throw "User uid not found"; }

		const message = {
			"timestamp": new Date().getTime(), //not totally sure but I think we don't want the .getTime(), because I think it deletes the Date information, but no time for that now
			"sender": user._id,
			"content": req.body.content,
			"read": false
		};

		let recipientEmail;
		let senderName = user.name;
		let recipientTokens = [];

		let chat = await Chat.findOne({ $or: [{$and: [{personA: user._id}, {personB: req.body.recipientId}]}, {$and: [{personB: user._id}, {personA: req.body.recipientId}]}] }).populate([{path: 'personA', model: "User", select: ['name', 'mail', 'apnTokens']}, {path: 'personB', model: "User", select: ['name', 'mail', 'apnTokens']}, {path:'messages.sender', model:'User', select: ['name']}]);
		if (chat) {
			await Chat.updateOne({_id: chat._id}, { $push: { messages: message } });
		}
		else {
			// not sure if populate works on create
			chat = await Chat.create({personA: user._id, personB: req.body.recipientId, messages: [message]}).populate([{path: 'personA', model: "User", select: ['name', 'mail', 'apnTokens']}, {path: 'personB', model: "User", select: ['name', 'mail', 'apnTokens']}, {path:'messages.sender', model:'User', select: ['name']}]);
		}
		if (JSON.stringify(user._id) == JSON.stringify(chat.personA._id)) {
			recipientTokens = chat.personB.apnTokens;
			recipientEmail = chat.personB.mail;
		} else {
			recipientTokens = chat.personA.apnTokens;
			recipientEmail = chat.personA.mail;
		}
			
		if (recipientTokens?.length > 0){ // send push notification
			PushNotificationHandler.shared.sendPushNotification(senderName, req.body.content, recipientTokens);
		}

		const mailoptions = { // German version
			from: "info@trentapp.com",
			to: recipientEmail,
			subject: `Neue Nachricht von ${senderName} auf Trent.`,
			text: `Link zum Chat: trentapp.com/chats/${chat._id} \n\n${senderName} schreibt: ${req.body.content}`
		};
		transporter.sendMail(mailoptions, callbackSendMail);
		Logger.shared.log(`Successfully sent message.`);
		res.status(200).json({ status: "success", chatId: chat._id });
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

		const chats = await Chat.find({ $or: [{ personA: userId }, { personB: userId }] }).populate([{path: 'personA', model: "User", select: ['name', 'mail', 'apnTokens']}, {path: 'personB', model: "User", select: ['name', 'mail', 'apnTokens']}, {path:'messages.sender', model:'User', select: ['name', 'deleted']}]);

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
		const chat = await Chat.findById(req.params.id).populate([{path: 'personA', model: "User", select: ['name', 'mail', 'apnTokens']}, {path: 'personB', model: "User", select: ['name', 'mail', 'apnTokens']}, {path:'messages.sender', model:'User', select: ['name', 'deleted', 'picture']}]);
		if (!user || (JSON.stringify(chat.personA._id) != JSON.stringify(user._id) && JSON.stringify(chat.personB._id) != JSON.stringify(user._id))){
			throw "No access to chat!";
		}
		for (let i = 0; i < chat.messages.length; i++) {
			if (JSON.stringify(chat.messages[i].sender._id) != JSON.stringify(user._id)) {
				chat.messages[i].read = true;
			}
		}
		await Chat.updateOne({_id: chat._id}, {messages: chat.messages});
		Logger.shared.log(`Successfully sent chat with id: ${req.params.id}`);
		res.status(200).json(chat);//for long chats you may need send because we are populating pictures
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

		const chats = await Chat.find({ $or: [{ personA: userId }, { personB: userId }] }).populate([{path: 'personA', model: "User", select: ['name', 'mail', 'apnTokens']}, {path: 'personB', model: "User", select: ['name', 'mail', 'apnTokens']}, {path:'messages.sender', model:'User', select: ['name', 'deleted']}]);
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


export default chatRouter;
