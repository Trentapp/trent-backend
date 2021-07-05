import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Transaction from "../models/Transaction.js"

const transactionRouter = express.Router();


transactionRouter.post("/sendRequest", async (req, res) => {//I would change the name of that route
	try {
		if (!req.body.user_uid || !req.body.product_id || !req.body.start_date || !req.body.end_date) { throw "Missing parameters"; }
		const user = await User.findOne({ uid: req.body.user_uid });
		const user_id = user._id;
		if (!user_id) { throw "User uid not found" }
		const product = await Product.findById(req.body.product_id).populate([{path: "user", model:'Users', select:['name']}]);
		const lender_id = product.user._id;
		if (!lender_id) { console.log("Lender id not found"); throw "Lender id not found"; }
		if (lender_id == user_id) { console.log("Invalid operation: Lender can not be the same user as borrower"); throw "Invalid operation: Lender can not be the same user as borrower" }
		const [d_end, d_start] = [new Date(req.body.end_date), new Date(req.body.start_date)];
		const diffMilliSeconds = d_end - d_start;
		if (diffMilliSeconds < 0){
			console.log("Start date is after End Date");
			throw "Start Date must be before End Date";
		}
		let total_price;
		if (product.prices.perHour){
			total_price = Math.min(Math.ceil(diffMilliSeconds/(1000*60*60*24)) * product.prices.perDay, Math.ceil(diffMilliSeconds/(1000*60*60)) * product.prices.perHour);
		} else {
			total_price = Math.ceil(diffMilliSeconds/(1000*60*60*24)) * product.prices.perDay;
		}

		const transaction = {
			"borrower": user_id,
			"lender": lender_id,
			"item": req.body.product_id,
			"start_date": req.body.start_date,
			"end_date": req.body.end_date,
			"granted": 0,
			"total_price": total_price
		};
		const newTransaction = await Transaction.create(transaction);
		await User.updateOne({_id: user_id}, { $push: { transactions_borrower: newTransaction._id } });
		await User.updateOne({_id: lender_id}, { $push: { transactions_lender: newTransaction._id } });

		res.status(200).json({ status: "success" });
	} catch (e) {
		res.status(500).json({ message: e });
	}
});

transactionRouter.get("/transaction/:id", async (req,res) => {
	try {
		const transaction = await Transaction.findById(req.params.id).populate([{path: 'item', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		res.status(200).json(transaction);
	} catch (e) {
		res.status(500).json({ message: e });
	}
});

//small problem: If someone goes to the backend API, he could see all the transactions for a user, so perhaps change query by user._id to query by user.uid, but not high priority

//find by lender and find by borrower now only return current transactions (not cancelled and not enddate < now)
transactionRouter.get("/findByLender/:user_id", async (req,res) => {
	try {
		const transactions = await Transaction.find({$and: [{lender: req.params.user_id}, {end_date: {$gte: new Date()}}, {granted: {$ne: 1}}]}).populate([{path: 'item', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		res.status(200).json(transactions);
	} catch (e) {
		res.status(500).json({ message: e });
	}
});

transactionRouter.get("/findByBorrower/:user_id", async (req,res) => {
	try {
		const transactions = await Transaction.find({$and: [{borrower: req.params.user_id}, {end_date: {$gte: new Date()}}, {granted: {$ne: 1}}]}).populate([{path: 'item', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		res.status(200).json(transactions);
	} catch (e) {
		res.status(500).json({ message: e });
	}
});

//findPastTransactions returns all transactions of a user that were cancelled ore where enddate < now
transactionRouter.get("/findPastTransactions/:user_id", async (req,res) => {
	try {
		const transactions = await Transaction.find({$and: [{$or: [{lender: req.params.user_id}, {borrower: req.params.user_id}]}, {$or: [{end_date: {$lt: new Date()}}, {granted: 1}]}]}).populate([{path: 'item', select: ['name']}, {path: 'borrower', select: ['name']}, {path: 'lender', select: ['name']}]);
		res.status(200).json(transactions);
	} catch (e) {
		res.status(500).json({ message: e });
	}
});

transactionRouter.patch("/setTransactionStatus/:id", async (req,res) => { //put the granted code into req.body.granted // (also pass uid in body)
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
		res.status(200).json({status: "success"});
	} catch (e) {
		res.status(500).json({ message: e });
	}
});


export default transactionRouter;
