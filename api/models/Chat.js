import mongoose from "mongoose"

export const MessageSchema = mongoose.Schema({
	sender: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
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
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	borrower: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	product:{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Product',
		required: true
	},
	messages: [MessageSchema]
})

ChatSchema.index({name: "text"});
export default mongoose.model("Chat", ChatSchema);
