import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Transaction from "../models/Transaction.js"

import Logger from "../../Logger.js"
import PushNotificationHandler from "../../PushNotificationHandler.js"
import MangoPayClient from "../../MangoPayClient.js"
import { transporter, callbackSendMail } from "../mail.js"

const transactionRouter = express.Router();


transactionRouter.post("/createTransaction", async (req, res) => {
	Logger.shared.log(`Sending transaction Request`);
	try {
		if (!req.body.uid || !req.body.productId || !req.body.startDate || !req.body.endDate) { throw "Missing parameters"; }
		const user = await User.findOne({ uid: req.body.uid });
		const userId = user._id;
		if (!userId) { Logger.shared.log(`Could not authenticate user`, 1); throw "User uid not found" }
		const product = await Product.findById(req.body.productId).populate([{path: "user", model:'User', select:['name', 'mail', 'apnTokens']}]);
		const lenderId = product.user._id;
		if (!lenderId) { Logger.shared.log(`Lender not found`, 1); throw "Lender id not found"; }
		if (lenderId == userId) { Logger.shared.log(`Lender cannot be same user as borrower`, 1); throw "Invalid operation: Lender can not be the same user as borrower" }
		const [endDate, startDate] = [new Date(req.body.endDate), new Date(req.body.startDate)];
		const diffMilliSeconds = endDate - startDate;
		if (diffMilliSeconds < 0){
			Logger.shared.log(`Invalid date: End date must be after start date`, 1);
			throw "Start Date must be before End Date";
		}
		let totalPrice;
		if (product.prices.perHour){
			totalPrice = Math.min(Math.ceil(diffMilliSeconds/(1000*60*60*24)) * product.prices.perDay, Math.ceil(diffMilliSeconds/(1000*60*60)) * product.prices.perHour);
		} else {
			totalPrice = Math.ceil(diffMilliSeconds/(1000*60*60*24)) * product.prices.perDay;
		}

		const transaction = {
			"borrower": userId,
			"lender": lenderId,
			"product": req.body.productId,
			"startDate": req.body.startDate,
			"endDate": req.body.endDate,
			"status": 0,
			"totalPrice": totalPrice,
			"lenderEarnings":1,
			"isPaid": false,
		};
		const newTransaction = await Transaction.create(transaction);

		//are the transactionsBorrower and transactionsLender lists useful? (For what?)
		await User.updateOne({_id: userId}, { $push: { transactionsBorrower: newTransaction._id } });
		await User.updateOne({_id: lenderId}, { $push: { transactionsLender: newTransaction._id } });
		Logger.shared.log(`Successfully sent request with id: ${newTransaction._id}`);
		PushNotificationHandler.shared.sendPushNotification("New borrowing request", `${user.name} has requested to borrow ${product.name}`, product.user.apnTokens);
		// send Email notification
		const mailoptions = {
			from: "info@trentapp.com",
			to: product.user.mail,
			subject: `${user.name} wants to borrow your ${product.name}`,
			text: `View your requests: trentapp.com/transactions \n\n${user.name} wants to borrow your ${product.name} from ${new Date(req.body.startDate).toLocaleString()} to ${new Date(req.body.endDate).toLocaleString("de")} for ${totalPrice/100}€.`
		};
		transporter.sendMail(mailoptions, callbackSendMail);
		res.status(200).json({ status: "success" });
	} catch (e) {
		Logger.shared.log(`Sending request failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

// get transaction by id
transactionRouter.post("/transaction/:id", async (req,res) => {
	Logger.shared.log(`Getting transaction with id: ${req.params.id}`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transaction = await Transaction.findById(req.params.id).populate([{path: 'product', select: ['name', 'address', 'thumbnail']}, {path: 'borrower', select: ['name', 'picture', 'numberOfRatings', 'rating', "picture"]}, {path: 'lender', select: ['name', "picture"]}]);
		if (!user || (JSON.stringify(transaction.borrower._id) != JSON.stringify(user._id) && JSON.stringify(transaction.lender._id) != JSON.stringify(user._id))){
			throw "No access to transaction!";
		}
		Logger.shared.log(`Got transaction successfully`);
		res.status(200).json(transaction);
	} catch (e) {
		Logger.shared.log(`Getting transaction failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

//find all transactions of a user
transactionRouter.post("/findByUser", async (req, res) => {
	Logger.shared.log("Getting all transactions of a user");
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transactions = await Transaction.find({$or: [{lender: user._id}, {borrower: user._id}]}).sort([['startDate', -1]]).populate([{path: 'product', select: ['name', 'address', 'thumbnail']}, {path: 'borrower', select: ['name', 'picture', 'numberOfRatings', 'rating', "picture"]}, {path: 'lender', select: ['name', "picture"]}]);
		Logger.shared.log(`Successfully got transactions for user with id: ${user._id}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting transaction for user ${e}`, 1);
		res.status(500).json({ message: e });
	}
})

transactionRouter.post("/getUpcoming", async (req,res) => {
	try {
		Logger.shared.log(`Getting upcoming transactions of user`);
		const user = await User.findOne({uid: req.body.uid});
		const transactions = await Transaction.find({$and: [{$or:[{borrower: user._id}, {lender: user._id} ]}, {endDate: {$gte: new Date()}}, {status: {$ne: 1}}]}).populate([{path: 'product', select: ['name', 'address', 'thumbnail']}, {path: 'borrower', select: ['name', "picture"]}, {path: 'lender', select: ['name', "picture"]}]);
		Logger.shared.log(`Successfully got transaction for user with id: ${user._id}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting transaction for user ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.post("/getNewRequests", async (req,res) => {
	try {
		Logger.shared.log(`Getting new requests for user`);
		const user = await User.findOne({uid: req.body.uid});
		const transactions = await Transaction.find({$and: [{lender: user._id}, {endDate: {$gte: new Date()}}, {status: {$eq: 0}}]}).populate([{path: 'product', select: ['name', 'address', 'thumbnail']}, {path: 'borrower', select: ['name', "picture"]}, {path: 'lender', select: ['name', "picture"]}]);
		Logger.shared.log(`Successfully got transaction for user with id: ${user._id}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting transaction for user ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.patch("/setTransactionStatus/:id", async (req,res) => { //put the status code into req.body.status // (also pass uid in body)
	Logger.shared.log(`Setting status ${req.body.status} for transaction with id: ${req.params.id}`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transaction = await Transaction.findById(req.params.id).populate([{path: 'product', select: ['name']}, {path: 'borrower', select: ['name', 'apnTokens']}, {path: 'lender', select: ['name', 'apnTokens']}]);
		// if (JSON.stringify(user._id) == JSON.stringify(transaction.borrower._id) && req.body.status == 1) { //the borrower can only cancel a request
		if (JSON.stringify(user._id) == JSON.stringify(transaction.borrower._id) && req.body.status == 1 && transaction.status == 0) {
			await Transaction.updateOne({_id: req.params.id}, {status: 1});
			PushNotificationHandler.shared.sendPushNotification("Booking cancelled", `${user.name} has cancelled the booking of ${transaction.product.name}`, transaction.lender.apnTokens);
		}
		else if (JSON.stringify(user._id) == JSON.stringify(transaction.lender._id)){
			if (req.body.status == 2 && transaction.status == 0){
				await Transaction.updateOne({_id: req.params.id}, {status: 2});
				PushNotificationHandler.shared.sendPushNotification("Payment required", `${user.name} has approved the booking of ${transaction.product.name}. Please complete the booking by continuing with your payment.`, transaction.borrower.apnTokens);
			} else if (req.body.status == 1){
				await Transaction.updateOne({_id: req.params.id}, {status: 1});
				PushNotificationHandler.shared.sendPushNotification("Booking cancelled", `${user.name} has cancelled the booking of ${transaction.product.name}`, transaction.borrower.apnTokens);
			}
		}
		else {
			Logger.shared.log("User not allowed to set status of this transaction");
			throw "User not allowed to set status of this transaction";
		}
		Logger.shared.log(`Successfully set status ${req.body.status} for transaction with id: ${req.params.id}`);
		res.status(200).json({status: "success"});
	} catch (e) {
		Logger.shared.log(`Setting status ${req.body.status} failed for transaction with id: ${req.params.id}; ${e}`, 1);
		res.status(500).json({ message: e });
	}
});


export default transactionRouter;



// deprecated, I think


//find by lender and find by borrower now only return current transactions (not cancelled and not enddate < now)
transactionRouter.post("/findByLender", async (req,res) => {
	Logger.shared.log(`Getting transaction for lender`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transactions = await Transaction.find({$and: [{lender: user._id}, {endDate: {$gte: new Date()}}, {status: {$ne: 1}}]}).populate([{path: 'product', select: ['name', 'address', 'thumbnail']}, {path: 'borrower', select: ['name', 'picture', 'numberOfRatings', 'rating', "picture"]}, {path: 'lender', select: ['name', "picture"]}]);
		Logger.shared.log(`Successfully got transaction for lender with id: ${user._id}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting transaction for lender ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.post("/findByBorrower", async (req,res) => {
	try {
		Logger.shared.log(`Getting transaction for borrower`);
		const user = await User.findOne({uid: req.body.uid});
		const transactions = await Transaction.find({$and: [{borrower: user._id}, {endDate: {$gte: new Date()}}, {status: {$ne: 1}}]}).populate([{path: 'product', select: ['name', 'address', 'thumbnail']}, {path: 'borrower', select: ['name', 'picture', 'numberOfRatings', 'rating', "picture"]}, {path: 'lender', select: ['name', "picture"]}]);
		Logger.shared.log(`Successfully got transaction for borrower with id: ${user._id}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting transaction for borrower`, 1);
		res.status(500).json({ message: e });
	}
});

//findPastTransactions returns all transactions of a user that were cancelled ore where enddate < now
transactionRouter.post("/findPastTransactions", async (req,res) => {
	Logger.shared.log(`Getting past transaction for user`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transactions = await Transaction.find({$and: [{$or: [{lender: user._id}, {borrower: user._id}]}, {$or: [{endDate: {$lt: new Date()}}, {status: 1}]}]}).populate([{path: 'product', select: ['name']}, {path: 'borrower', select: ['name', "picture"]}, {path: 'lender', select: ['name', "picture"]}]);
		Logger.shared.log(`Successfully got past transaction for user with id: ${user._id}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting past transaction for user`, 1);
		res.status(500).json({ message: e });
	}
});



