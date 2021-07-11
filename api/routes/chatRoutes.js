import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Chat from "../models/Chat.js"

const chatRouter = express.Router();

//every route here with prefix /api/chats

chatRouter.post("/sendMessage", async (req, res) => {
	try {
		if (!req.body.user_uid || !(req.body.chat_id || req.body.item_id) || !req.body.content) { throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.body.user_uid });
		const user_id = user._id;
		if (!user_id) { throw "User uid not found"; }

		const message = {
			"timestamp": new Date().getTime(), //not totally sure but I think we don't want the .getTime(), because I think it deletes the Date information, but no time for that now
			"sender": user_id,
			"content": req.body.content,
			"read": false
		};

		if (req.body.chat_id) {// I would put that into a put("/updateChat/:id") route, but not important
			const chat = await Chat.findById(req.body.chat_id).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
			if (chat.borrower._id != user_id && chat.lender._id != user_id) { throw "User not authorized"; }

			await Chat.findByIdAndUpdate(req.body.chat_id, { $push: { messages: message } });
		} else {
			const existingChat = await Chat.findOne({ $and: [{ 'item': req.body.item_id }, { $or: [{ 'borrower': user_id }, { 'lender': user_id }] }] }).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
			if (existingChat) {
				existingChat.messages.push(message);
				existingChat.save();
			} else {
				const product = await Product.findById(req.body.item_id).populate([{path:'user', model:'Users', select:['name']}]);
				if (product.user._id == user_id && !req.body.recipient) { throw "missing parameters"; }

				const chat = {
					"lender": product.user._id,
					"borrower": (product.user._id == user_id) ? req.body.recipient : user_id,
					"item": req.body.item_id,
					"messages": [message]
				}
				const newChat = await Chat.create(chat);
			}
		}


		res.status(200).json({ status: "success" });
	} catch (e) {
		res.status(500).json({ message: e });
	}
});


// get should definitely be implemented as http GET request. We can put the uid into the route (/get/:uid) (I think it is not dangerous if you thought that)
// can we delete that function, or are you still using it?
chatRouter.post("/get", async (req, res) => {
	try {
		console.log("body passed into /chats/get : ", req.body);
		if (!req.body.uid) { throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.body.uid });
		const user_id = user._id;
		if (!user_id) { throw "User uid not found"; }

		const chats = await Chat.find({ $or: [{ borrower: user_id }, { lender: user_id }] }).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);

		res.status(200).json(chats);
	} catch (e) {
		res.status(500).json({ message: e });
	}
});

chatRouter.get("/chatsOfUser/:user_uid", async (req,res) => {
	try {
		if (!req.params.user_uid) { throw "Missing parameters"; }

		const user = await User.findOne({ uid: req.params.user_uid });
		const user_id = user._id;
		if (!user_id) { throw "User uid not found"; }

		const chats = await Chat.find({ $or: [{ borrower: user_id }, { lender: user_id }] }).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);

		res.status(200).json(chats);
	} catch (e) {
		res.status(500).json({ message: e });
	}
});

chatRouter.get("/chat/:id", async (req,res) => {
	try {
		const chat = await Chat.findById(req.params.id).populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
		res.status(200).json(chat);
	} catch (e) {
		res.status(500).json({ message: e });
	}
})

//attention: if that method is called and the corresponding chat does not exist yet, the chat is created
chatRouter.get("/getByLenderBorrowerProduct/:lenderId/:borrowerId/:productId", async (req,res) => {
	try {
		let chat = await Chat.findOne({$and: [{'lender': req.params.lenderId}, {'borrower': req.params.borrowerId}, {'item': req.params.productId}] });
		if (!chat){
			chat = await Chat.create({lender: req.params.lenderId, borrower: req.params.borrowerId, item: req.params.productId, messages: []});//this somehow not may be returned properly
		} else {
			await chat.populate([{path: 'item', model: "Products", select: ['name']}, {path: 'borrower', model: "Users", select: ['name']}, {path: 'lender', model: "Users", select: ['name']}, {path:'messages.sender', model:'Users', select: ['name']}]);
		}
		res.status(200).json(chat);
	} catch (e) {
		res.status(500).json({ message: e });
	}
})

export default chatRouter;
