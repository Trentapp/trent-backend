import mongoose from "mongoose"

export const MessageSchema = mongoose.Schema({
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
		type: Boolean,
		required: true
	}
});

const ChatSchema = mongoose.Schema({
	lender: String,
	borrower: String,
	item_id: String,
	messages: [MessageSchema]
})

ChatSchema.index({name: "text"});
export default mongoose.model("Chats", ChatSchema);
