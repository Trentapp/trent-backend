import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Transaction from "../models/Transaction.js"

import Logger from "../../Logger.js"

const transactionRouter = express.Router();


transactionRouter.post("/createTransaction", async (req, res) => {
	const logBody = req.body;
	logBody["uid"] = "*censored*";
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
		const [endDate, startDate] = [new Date(req.body.endDate), new Date(req.body.startDate)];
		const diffMilliSeconds = endDate - startDate;
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
			"product": req.body.productId,
			"startDate": req.body.startDate,
			"endDate": req.body.endDate,
			"status": 0,
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

// get transaction by id
transactionRouter.post("/transaction/:id", async (req,res) => {
	Logger.shared.log(`Getting transaction with id: ${req.params.id}`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transaction = await Transaction.findById(req.params.id).populate([{path: 'product', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		if (!user || (transaction.borrower._id != user._id && transaction.lender._id != user._id)){
			throw "No access to transaction!";
		}
		Logger.shared.log(`Got transaction successfully`);
		res.status(200).json(transaction);
	} catch (e) {
		Logger.shared.log(`Getting transaction failed: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

//small problem: If someone goes to the backend API, he could see all the transactions for a user, so perhaps change query by user._id to query by user.uid, but not high priority

//find by lender and find by borrower now only return current transactions (not cancelled and not enddate < now)
transactionRouter.get("/findByLender", async (req,res) => {
	Logger.shared.log(`Getting transaction for lender`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transactions = await Transaction.find({$and: [{lender: user._id}, {endDate: {$gte: new Date()}}, {status: {$ne: 1}}]}).populate([{path: 'product', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		Logger.shared.log(`Successfully got transaction for lender with id: ${user._id}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting transaction for lender with id: ${user._id}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.post("/findByBorrower", async (req,res) => {
	try {
		Logger.shared.log(`Getting transaction for borrower`);
		if (!user) {
			const user = await User.findOne({uid: req.body.uid});
			const transactions = await Transaction.find({$and: [{borrower: user._id}, {endDate: {$gte: new Date()}}, {status: {$ne: 1}}]}).populate([{path: 'product', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		} else {
			Logger.shared.log(`User not found`, 1);
			throw "User not authorized";
		}

		Logger.shared.log(`Successfully got transaction for borrower with id: ${user._id}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting transaction for borrower with id: ${user._id}`, 1);
		res.status(500).json({ message: e });
	}
});

//findPastTransactions returns all transactions of a user that were cancelled ore where enddate < now
transactionRouter.post("/findPastTransactions", async (req,res) => {
	Logger.shared.log(`Getting past transaction for user`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transactions = await Transaction.find({$and: [{$or: [{lender: user._id}, {borrower: user._id}]}, {$or: [{endDate: {$lt: new Date()}}, {status: 1}]}]}).populate([{path: 'product', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		Logger.shared.log(`Successfully got past transaction for user with id: ${user._id}`);
		res.status(200).json(transactions);
	} catch (e) {
		Logger.shared.log(`Failed getting past transaction for user with id: ${user._id}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.patch("/setTransactionStatus/:id", async (req,res) => { //put the status code into req.body.status // (also pass uid in body)
	Logger.shared.log(`Setting status ${req.body.status} for transaction with id: ${req.params.id}`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		const transaction = await Transaction.findById(req.params.id).populate([{path: 'product', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		if (JSON.stringify(user._id) == JSON.stringify(transaction.borrower._id) && req.body.status == 1) { //the borrower can only cancel a request
			await Transaction.updateOne({_id: req.params.id}, {status: 1});
		}
		else if (user._id == transaction.lender._id){
			if (req.body.status == 2 && transaction.status == 0){
				await Transaction.updateOne({_id: req.params.id}, {status: 2});
			} else if (req.body.status == 1){
				await Transaction.updateOne({_id: req.params.id}, {status: 1});
			}
		}
		Logger.shared.log(`Successfully set status ${req.body.status} for transaction with id: ${req.params.id}`);
		res.status(200).json({status: "success"});
	} catch (e) {
		Logger.shared.log(`Setting status ${req.body.status} failed for transaction with id: ${req.params.id}`, 1);
		res.status(500).json({ message: e });
	}
});


export default transactionRouter;
