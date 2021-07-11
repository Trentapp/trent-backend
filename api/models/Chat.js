import mongoose from "mongoose"

export const MessageSchema = mongoose.Schema({
	sender: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Users",
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
		type: Boolean,
		required: true
	}
});

const ChatSchema = mongoose.Schema({
	lender: {
		type: String,
		required: true
	},
	borrower: {
		type: String,
		required: true
	},
	item: {
		type: String,
		required: true
	},
	messages: [MessageSchema]
})

ChatSchema.index({name: "text"});
export default mongoose.model("Chats", ChatSchema);
