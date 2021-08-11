import express from "express"
import User from "../models/User.js"
import Transaction from "../models/Transaction.js"

import Logger from "../../Logger.js"
import PushNotificationHandler from "../../PushNotificationHandler.js"
import MangoPayClient from "../../MangoPayClient.js"

const paymentRouter = express.Router();

paymentRouter.post("/createMangopayUser", async (req, res) => {
  Logger.shared.log("Creating Mangopay user");
    try {
        if(!req.body.uid || !req.body.birthday || !req.body.nationality || !req.body.countryOfResidence) {
          throw "Missing parameters";
        }
        const user = await User.findOne({ uid: req.body.uid });
        console.log(`user with uid ${req.body.uid}`);
        if (!user.mangopayId && !user.walletId) {
          await MangoPayClient.shared.createNewUser(req.body.uid, "first name", user.name, req.body.birthday, req.body.nationality, req.body.countryOfResidence, user.mail);
        }
        res.status(200).json({ status: "success" });
    } catch (e) {
      Logger.shared.log(`Error creating Mangopay User: ${e}`);
        res.status(500).json({ message: e });
    }
});

transactionRouter.post("/createCardRegistration", async (req,res) => {
	Logger.shared.log(`Registering card`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		if(!user){
			throw "User not found";
		}
		Logger.shared.log(`Successfully registered card`);
		const response = await MangoPayClient.shared.createCardRegistration(req.body.uid);
		res.status(200).json(response);
	} catch (e) {
		Logger.shared.log(`Failed to register card: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.post("/updateCardRegistration", async (req,res) => {
	Logger.shared.log(`Updating card`);
	try {
		const user = await User.findOne({uid: req.body.uid});
		if(!user || !req.body.registrationData || !req.body.registrationId){
			throw "User or registrationData not found";
		}
		Logger.shared.log(`Successfully updated card`);
		const response = await MangoPayClient.shared.updateCardRegistration(req.body.uid, req.body.registrationData, req.body.registrationId);
		res.status(200).json(response);
	} catch (e) {
		Logger.shared.log(`Failed to update card: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

transactionRouter.post("/payIn", async (req,res) => {
	Logger.shared.log(`Paying in`);
	try {
		if(!req.body.uid || !req.body.transactionId || !req.body.cardId){
			throw "User or registrationData not found";
		}
		const response = await MangoPayClient.shared.createPayIn(req.body.uid, req.body.transactionId, req.body.cardId, "2003:C8:CF2F:4218:D017:5412:6570:7E26", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15");
		Logger.shared.log(`Successfully payed in`);
		res.status(200).json(response);
	} catch (e) {
		Logger.shared.log(`Failed to pay in: ${e}`, 1);
		res.status(500).json({ message: e });
	}
});

export default paymentRouter;
