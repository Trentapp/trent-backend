import fs from "fs"

class Logger {

	static shared = new Logger();

	constructor() {
			this.prefixes = ["", "ERROR: ", "Warning: "];
	}

	log(message, prefix=0) {
		let dateObject = new Date();
		let date = ("0" + dateObject.getDate()).slice(-2);
		let month = ("0" + (dateObject.getMonth() + 1)).slice(-2);
		let year = dateObject.getFullYear();
		let hours = dateObject.getHours();
		let minutes = dateObject.getMinutes();
		let seconds = dateObject.getSeconds();

		let dateString = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

		let content = "[" + dateString + "]" + " " + this.prefixes[prefix] + message;

		console.log(content);
		fs.writeFile('./server.log', content + "\n", { flag: 'a+' }, err => {})
	}

}

export default Logger
