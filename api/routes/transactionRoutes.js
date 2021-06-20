import express from "express"
import User from "../models/User.js"
import Product from "../models/Product.js"
import Transaction from "../models/Transaction.js"

const transactionRouter = express.Router();

transactionRouter.post("/add", async (req,res) => {
    try {

				if (!req.body.user_uid || !req.body.product_id) { throw "Missing parameters"; }

        const user_result = await User.find({uid: req.body.user_uid});
        const user = user_result[0];
        const user_id = user._id;
        if(!user_id) { throw "User uid not found" }

				const product = await Product.findById(req.body.productId);
        const lender_id = product.user_id;
        if(!product_id) { throw "Lender id not found"; }

				if(lender_id == user_id) { throw "Invalid operation: Lender can not be the same user as borrower"}


				const transaction = {
					"borrower" : user_id,
					"lender" : lender_id,
					"item_id" : req.body.product_id,
					"messages" : []
				};

				const newTransaction = await Transaction.create(transaction);

				await User.findByIdAndUpdate(user_id, {$push: {transactions_borrower: newTransaction._id}})
				await User.findByIdAndUpdate(lender_id, {$push: {transactions_lender: newTransaction._id}})

        res.status(200).json({status: "success", productId: newProduct._id});
    } catch(e) {
        res.status(500).json({message:e});
    }
});


transactionRouter.post("/sendMessage", async (req,res) => {
    try {
				if (!req.body.user_uid || !req.body.transaction_id || !req.body.content) { throw "Missing parameters"; }

        const user_result = await User.find({uid: req.body.user_uid});
        const user = user_result[0];
        const user_id = user._id;
        if(!user_id) { throw "User uid not found" }

				const transaction = await Transaction.findById(req.body.transaction_id);
				if(transaction.borrower != user_id && transaction.lender != user_id) { throw "User not authorized"; }

				const message = {
					"timestamp" : new Date().getTime(),
					"sender" : user._id,
					"content" : req.body.content
				};

				await Transaction.findByIdAndUpdate(req.body.transaction_id, {$push: {messages: message}});

        res.status(200).json({status: "success", productId: newProduct._id});
    } catch(e) {
        res.status(500).json({message:e});
    }
});


transactionRouter.post("/sendRequest", async (req,res) => {
	try {
		if (!req.body.user_uid || !req.body.transaction_id || !req.body.start_date || !req.body.duration) { throw "Missing parameters"; }

		const user_result = await User.find({uid: req.body.user_uid});
		const user = user_result[0];
		const user_id = user._id;
		if(!user_id) { throw "User uid not found" }

		const transaction = await Transaction.findById(req.body.transaction_id);
		if(transaction.borrower != user_id && transaction.lender != user_id) { throw "User not authorized"; }

		if(transaction.request) { throw "Request already exists"; } // TODO: we should provide a method for updating requests as well

		const item = await Product.findById(transaction.item);
		const total_price = transaction.duration * item.prices.perHour;

		const request = {
			"start_date" : req.body.start_date,
			"duration" : req.body.duration,
			"granted" : false,
			"total_price" : total_price
		};

		await Transaction.findByIdAndUpdate(req.body.transaction_id, {"request":request});

		res.status(200).json({status: "success", productId: newProduct._id});
	} catch(e) {
		res.status(500).json({message:e});
	}
});


export default transactionRouter;
