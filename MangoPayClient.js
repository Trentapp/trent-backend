import mangopay from "mangopay2-nodejs-sdk"
import dotenv from "dotenv"

import User from "./api/models/User.js"

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
	    Email: "max@mustermann.de",
		}).then(async function (response) {
			console.log(response.Id);
    	console.log("Natural user created", response);
			const user = await User.findOne({ uid: uid });
			user.mangopayId = response.Id;
			await User.replaceOne({ uid : uid }, user);
		});
	}

}

export default MangoPayClient
