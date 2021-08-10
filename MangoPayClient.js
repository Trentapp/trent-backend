import mangopay from "mangopay2-nodejs-sdk"
import dotenv from "dotenv"

import User from "./api/models/User.js"
import Transaction from "./api/models/Transaction.js"

class MangoPayClient {

	static shared = new MangoPayClient();

	constructor() {
		dotenv.config();

		this.api = new mangopay({
    	clientId: process.env.MANGOPAY_CLIENT_ID,
    	clientApiKey: process.env.MANGOPAY_API_KEY
		});
	}

	createNewUser (uid, firstName, lastName, birthday, nationality, countryOfResidence, mail) {
		this.api.Users.create({
	    PersonType: "NATURAL",
	    FirstName: firstName,
	    LastName: lastName,
	    Birthday: birthday,
	    Nationality: nationality,
	    CountryOfResidence: "DE",
	    Email: mail,
		}).then(async function (response) {
			// TODO: Check for errors
			console.log(response.Id);
    	console.log("Natural user created", response);
			const user = await User.findOne({ uid : uid });
			console.log(`uid: ${uid}`);
			user.mangopayId = response.Id;
			// console.log(`user mangopay id: ${user.mangopayId}`);
			await User.replaceOne({ uid : uid }, user);
			MangoPayClient.shared.createWallet(user._id, response.Id);
		});
	}

	createWallet(_id, mangopayId) {
		console.log(`creating wallet; _id:${_id}; mangopay: ${mangopay}`);

		this.api.Wallets.create({
			Owners: [ mangopayId ],
			Description: `Wallet ${mangopayId}`,
			Currency: "EUR"
		}).then(async function (response) {
			// TODO: Check for errors
			console.log("Adding walletId to user in db");
			await User.findByIdAndUpdate(_id, {walletId: response.Id});
		});
	}

	async createCardRegistration (uid){
		return new Promise(async resolve =>{
		const user = await User.findOne({uid:uid});
		this.api.CardRegistrations.create({
			UserId : user.mangopayId,
			Currency : "EUR",
			CardType : "CB_VISA_MASTERCARD"
		}).then(async function (response) {
			// TODO: Check for errors
			resolve({PreregistrationData : response.PreregistrationData, CardRegistrationURL:response.CardRegistrationURL, AccessKey:response.AccessKey, CardRegistrationId: response.Id});
			// await User.findByIdAndUpdate(_id, {walletId: response.Id});
		});
	})
	}

	async updateCardRegistration(uid, registrationData, registrationId) {
		return new Promise(async resolve =>{
		const user = await User.findOne({uid:uid});
		this.api.CardRegistrations.update({
			RegistrationData : registrationData,
			Id : registrationId
		}).then(async function (response) {
			// TODO: Check for errors
			console.log(`response: ${response}`);
			if (response.ResultMessage == "Success") {
				resolve(response.CardId);
			}
			// await User.findByIdAndUpdate(_id, {walletId: response.Id});
		});
	})
	}

	async createPayIn(uid, transactionId, cardId) {
		return new Promise(async resolve => {
			const user = await User.findOne({uid:uid});
			const transaction = Transaction.findById(transactionId).populate({path:'lender', model:'User'});
			this.api.PayIns.create({
				AuthorId : user.mangopayId,
				CreditedWalletId : transaction.lender.walletId,
				DebitedFunds : transaction.totalPrice,
				Fees : transfers.lenderEarnings,
				SecureModeReturnURL : "trentapp.com",
				CardId : cardId,
				IpAddress : ip,
				BrowserInfo : userAgent,
			}).then(async function (response) {
				// TODO: Check for errors
				// console.log("Adding walletId to user in db");
				// await User.findByIdAndUpdate(_id, {walletId: response.Id});
				resolve(response);
			});
		})
	}

	// async addNewTransaction (uid, transactionId) {
	// 	let user = await User.findOne({uid:uid});
	// 	let mangopayId = user.mangopayId;
	//
	// 	const transaction = await Transaction.findById(transactionId);
	//
	// 	this.api.Transfer.create({
	// 		AuthorId: mangopayId,
	// 		DebitedFunds: {
	// 			Currency: "EUR",
	// 			Amount: 12
	// 		},
	// 		Fees: {
	// 			Currency: "EUR",
	// 			Amount: 12
	// 		},
	// 		DebitedWalletId: user.walletId,
	// 		CreditedWalletId: transaction.
	// 	}).then(res => {
	// 			// TODO: Check for errors
	// 			transaction.isPaid = true;
	// 		})
	// }

}

export default MangoPayClient
