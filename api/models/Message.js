import mongoose from "mongoose"

const MessageSchema = mongoose.Schema({
		sender: {
			type: String,
			required: true
		},
    timestamp: {
			type: Date,
			required: true
		},
		content: {
			type: String,
			required: true
		},
		read: {
			type: Bool,
			required: true
		}
});

MessageSchema.index({name: "text"});
export default mongoose.model("Messages", MessageSchema);
