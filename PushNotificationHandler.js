import apn from "apn"

class PushNotificationHandler {

	static shared = new PushNotificationHandler();

	constructor() {
			this.options = {
				token: {
					key: "AuthKey_F3T5R97C3S.p8",
			 		keyId: "F3T5R97C3S",
			 		teamId: "HJFU68N96J"
				},
				production: false
			};
	}

	sendPushNotification(title, message, tokens){
		let apnProvider = new apn.Provider(this.options);
		let notification = new apn.Notification();
		notification.expiry = Math.floor(Date.now() / 1000) + 24 * 3600;
		// notification.badge = 2;
		notification.sound = "ping.aiff";
		notification.alert = {
			title: `${title}`,
			body:`${message}`
		};
		notification.topic = "com.trentapp.Trent";
		for(var i = 0; i < tokens.length; i++){
			apnProvider.send(notification, tokens[i]);
		}

		apnProvider.shutdown();
	}

}

export default PushNotificationHandler
