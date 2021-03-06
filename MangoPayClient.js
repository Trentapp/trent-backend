import mangopay from "mangopay2-nodejs-sdk"
import dotenv from "dotenv"

import User from "./api/models/User.js"
import Transaction from "./api/models/Transaction.js"
import Logger from "./Logger.js"

class MangoPayClient {

	static shared = new MangoPayClient();

	constructor() {
		dotenv.config();

		this.api = new mangopay({
    	clientId: process.env.MANGOPAY_CLIENT_ID,
    	clientApiKey: process.env.MANGOPAY_API_KEY
		});
	}

	async createNewUser (uid, firstName, lastName, birthday, nationality, countryOfResidence, mail) {
		return new Promise(async resolve=> {
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
				resolve();
				// MangoPayClient.shared.createWallet(user._id, response.Id);
			});
		});
	}

	createWallet(_id, mangopayId) {
		console.log(`creating wallet; _id:${_id}; mangopayId: ${mangopay}`);

		this.api.Wallets.create({
			Owners: [ mangopayId ],
			Description: `Wallet ${mangopayId}`,
			Currency: "EUR"
		}).then(async function (response) {
			// TODO: Check for errors
			console.log("Adding walletId to user in db");
			await User.findByIdAndUpdate(_id, {walletId: response.Id});
		}).catch(function (err) {
		console.log(err.message);
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

	async getCardsOfUser(mangopayId) {
		console.log(mangopayId);
		return new Promise(async resolve =>{
		this.api.Users.getCards(mangopayId).then(async function (response) {
			// TODO: Check for errors
			console.log(`response: ${response}`);
			resolve(response);
			// await User.findByIdAndUpdate(_id, {walletId: response.Id});
		});
	})
	}

	async createPayIn(uid, transactionId, cardId, ip, userAgent) {
		return new Promise(async resolve => {
			const user = await User.findOne({uid:uid});
			const transaction = await Transaction.findById(transactionId);
			console.log(`transaction: ${transactionId}`);
			this.api.PayIns.create({
				PaymentType: "CARD",
				ExecutionType: "DIRECT",
				AuthorId : user.mangopayId,
				CreditedWalletId : user.walletId,
				DebitedFunds : {
					Currency:"EUR",
					Amount: transaction.totalPrice,
				},
				Fees : {
					Currency:"EUR",
					Amount: transaction.lenderEarnings,
				},
				SecureModeReturnURL : "https://www.trentapp.com",
				CardId : cardId,
				// IpAddress : ip,
				// BrowserInfo : userAgent,
			}).then(async function (response) {
				// TODO: Check for errors
				// console.log("Adding walletId to user in db");
				// await User.findByIdAndUpdate(_id, {walletId: response.Id});
				resolve(response);
			});
		})
	}

	async kycCheck (user, kycDocumentImages) {
		try {

			console.log("creating kyc document");

			// create document
			const documentId = await new Promise( resolve => {
				this.api.Users.createKycDocument(
					user.mangopayId,
					{
					Type : "IDENTITY_PROOF",
					UserId : user.mangopayId
				},
				function (data) {
				console.log(data)
				}
			).then(async function (response) {
					resolve(response.Id);
				}).catch(function (err) {
				console.log(err.message)
				resolve();
				});
			})

			console.log("created kyc document");

			// create page
			for(var i = 0; i < kycDocumentImages.length; i++){
				await new Promise(resolve => {
					this.api.Users.createKycPage(
						user.mangopayId,
						documentId,
					{
						KYCDocumentId : documentId,
						UserId : user.mangopayId,
						File : kycDocumentImages[i]
					},
					function (data) {
					console.log(data)
					}).then(async function (response) {
						resolve()
					}).catch(function (err) {
					console.log(err.message)
					resolve();
					});
				})
			}

			console.log("added pages");

			// ask for validation
			await new Promise( resolve => {
				this.api.Users.updateKycDocument(
					user.mangopayId,
					{
						Id : documentId,
					Status : "VALIDATION_ASKED",
					UserId : user.mangopayId
				},
				function (data) {
				console.log(data)
				}).then(async function (response) {
					resolve();
				}).catch(function (err) {
				console.log(err.message)
				resolve();
				});
			})

			console.log("asked for validation");
		} catch (e) {
			Logger.shared.log(`Error while uploading kyc document: ${e}`, 1)
		}

	}

	async addBankaccount(uid, iban) {
		try {
			const user = await User.findOne({uid:uid});
				this.api.Users.createBankAccount(
				user.mangopayId,
				{
				UserId: user.mangopayId,
				Type: "IBAN",
				OwnerName: user.name,
				OwnerAddress: {
						AddressLine1: user.address.streetWithNr,
						City: user.address.city,
						PostalCode: user.address.zipcode,
						// TODO !!
						Country: "DE"
				},
				IBAN: iban,
				},
				async function (response) {
				console.log(response);
				try {
					console.log(`bankaccountId: ${response.Id}`);
					user.bankaccountId = response.Id;
					console.log(`user.bankaccountId: ${user.bankaccountId}`);
					await User.replaceOne({uid:uid}, user);
					console.log(`added id to userr`);
				} catch(e) {
					Logger.shared.log(`Error while saving bankaccountId: ${e}`);
				}

				}
				).catch(function (err) {
				console.log(err.message)
				});
		} catch (e) {
			Logger.shared.log(`Error while creating: ${e}`);
		}
	}

	async payTransaction (uid, transactionId) {
		return new Promise(async resolve => {
			let user = await User.findOne({uid:uid});
			let mangopayId = user.mangopayId;

			const transaction = await Transaction.findById(transactionId).populate([{path:'lender', model:'User', select:['walletId']}]);;

			this.api.Transfers.create({
				AuthorId: mangopayId,
				DebitedFunds: {
					Currency: "EUR",
					Amount: transaction.totalPrice
				},
				Fees: {
					Currency: "EUR",
					Amount: transaction.totalPrice - transaction.lenderEarnings
				},
				DebitedWalletId: user.walletId,
				CreditedWalletId: transaction.lender.walletId
			}).then(res => {
					// TODO: Check for errors
					if(res.ResultMessage == "Success"){
						transaction.isPaid = true;
					}
					resolve(res);
				})
		})
	}

}

export default MangoPayClient
