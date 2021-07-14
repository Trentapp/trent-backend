import fs from "fs"

class Logger {

	static shared = new Logger();

	constructor() {
			this.prefixes = ["", "ERROR: ", "Warning: "];
	}

	log(message, prefix=0) {
		let date_ob = new Date();
		let date = ("0" + date_ob.getDate()).slice(-2);
		let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
		let year = date_ob.getFullYear();
		let hours = date_ob.getHours();
		let minutes = date_ob.getMinutes();
		let seconds = date_ob.getSeconds();

		let date_string = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

		let content = "[" + date_string + "]" + " " + this.prefixes[prefix] + message + "\n";

		console.log(content);
		fs.writeFile('./server.log', content, { flag: 'a+' }, err => {})
	}

}

export default Logger
