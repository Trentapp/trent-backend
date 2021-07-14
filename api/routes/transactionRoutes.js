import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Transaction from "../models/Transaction.js"

import Logger from "../../Logger.js"

const transactionRouter = express.Router();


transactionRouter.post("/createTransaction", async (req, res) => {
	const log_body = req.body;
	log_body["uid"] = "*censored*";
	Logger.shared.log(`Sending transaction Request ${req.body}`);
	try {
		if (!req.body.uid || !req.body.productId || !req.body.startDate || !req.body.endDate) { throw "Missing parameters"; }
		const user = await User.findOne({ uid: req.body.uid });
		const userId = user._id;
		if (!userId) { Logger.shared.log(`Could not authenticate user`, 1); throw "User uid not found" }
		const product = await Product.findById(req.body.productId).populate([{path: "user", model:'Users', select:['name']}]);
		const lenderId = product.user._id;
		if (!lenderId) { Logger.shared.log(`Lender not found`, 1); console.log("Lender id not found"); throw "Lender id not found"; }
		if (lenderId == userId) { Logger.shared.log(`Lender cannot be same user as borrower`, 1); console.log("Invalid operation: Lender can not be the same user as borrower"); throw "Invalid operation: Lender can not be the same user as borrower" }
		const [d_end, d_start] = [new Date(req.body.endDate), new Date(req.body.startDate)];
		const diffMilliSeconds = d_end - d_start;
		if (diffMilliSeconds < 0){
			Logger.shared.log(`Invalid date: End date must be after start date`, 1);
			console.log("Start date is after End Date");
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
			"item": req.body.productId,
			"startDate": req.body.startDate,
			"endDate": req.body.endDate,
			"granted": 0,
			"totalPrice": totalPrice
		};
		const newTransaction = await Transaction.create(transaction);
		await User.updateOne({_id: userId}, { $push: { transactionsBorrower: newTransaction._id } });
		await User.updateOne({_id: lenderId}, { $push: { transactionsLender: newTransaction._id } });

		Logger.shared.log(`Successfully sent request with id: ${newTransaction._id}`);
		res.status(200).json({ status: "success" });
	} catch (e) {
		Logger.shared.log(`Sending request failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.get("/transaction/:id", async (req,res) => {
	Logger.shared.log(`Getting transaction with id: ${req.params.id}`);
	try {
		const transaction = await Transaction.findById(req.params.id).populate([{path: 'item', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		Logger.shared.log(`Got transaction successfully`);
		res.status(200).json(transaction);
	} catch (e) {
		Logger.shared.log(`Getting transaction failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

//small problem: If someone goes to the backend API, he could see all the transactions for a user, so perhaps change query by user._id to query by user.uid, but not high priority

//find by lender and find by borrower now only return current transactions (not cancelled and not enddate < now)
transactionRouter.get("/findByLender/:userId", async (req,res) => {
	Logger.shared.log(`Getting transaction for lender with id: ${req.params.userId}`);
	try {
		const transactions = await Transaction.find({$and: [{lender: req.params.userId}, {endDate: {$gte: new Date()}}, {granted: {$ne: 1}}]}).populate([{path: 'item', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		Logger.shared.log(`Successfully got transaction for lender with id: ${req.params.userId}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting transaction for lender with id: ${req.params.userId}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.post("/findByBorrower", async (req,res) => {
	try {
		Logger.shared.log(`Getting transaction for borrower with id: ${req.body.uid}`);
		const user = await User.findOne({uid: req.body.uid});
		if (!user) {
			const transactions = await Transaction.find({$and: [{borrower: user._id}, {endDate: {$gte: new Date()}}, {granted: {$ne: 1}}]}).populate([{path: 'item', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		} else {
			Logger.shared.log(`User not found`, 1);
			throw "User not authorized";
		}

		Logger.shared.log(`Successfully got transaction for borrower with id: ${req.params.userId}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting transaction for borrower with id: ${req.params.userId}`, 1);
		res.status(500).json({ message: e });
	}
});

//findPastTransactions returns all transactions of a user that were cancelled ore where enddate < now
transactionRouter.get("/findPastTransactions/:userId", async (req,res) => {
	Logger.shared.log(`Getting past transaction for user with id: ${req.params.userId}`);
	try {
		const transactions = await Transaction.find({$and: [{$or: [{lender: req.params.userId}, {borrower: req.params.userId}]}, {$or: [{endDate: {$lt: new Date()}}, {granted: 1}]}]}).populate([{path: 'item', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		Logger.shared.log(`Successfully got past transaction for user with id: ${req.params.userId}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting past transaction for user with id: ${req.params.userId}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.patch("/setTransactionStatus/:id", async (req,res) => { //put the granted code into req.body.granted // (also pass uid in body)
	Logger.shared.log(`Setting status ${req.body.granted} for transaction with id: ${req.params.id}`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transaction = await Transaction.findById(req.params.id).populate([{path: 'item', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		if (JSON.stringify(user._id) == JSON.stringify(transaction.borrower._id) && req.body.granted == 1) { //the borrower can only cancel a request
			await Transaction.updateOne({_id: req.params.id}, {granted: 1});
		}
		else if (user._id == transaction.lender._id){
			if (req.body.granted == 2 && transaction.granted == 0){
				await Transaction.updateOne({_id: req.params.id}, {granted: 2});
			} else if (req.body.granted == 1){
				await Transaction.updateOne({_id: req.params.id}, {granted: 1});
			}
		}
		Logger.shared.log(`Successfully set status ${req.body.granted} for transaction with id: ${req.params.id}`);
		res.status(200).json({status: "success"});
	} catch (e) {
		Logger.shared.log(`Setting status ${req.body.granted} failed for transaction with id: ${req.params.id}`, 1);
		res.status(500).json({ message: e });
	}
});


export default transactionRouter;
