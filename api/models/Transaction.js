import mongoose from "mongoose"

export const RequestSchema = mongoose.Schema({
    start_date: {
			type: Date,
			required: true
		},
		duration: {
			type: Number,
			required: true
		},
		granted: {
			type: Number,
			required: true
		},
		total_price: {
			type: Number,
			required: true
		}
});

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
		}
});

const TransactionSchema = mongoose.Schema({ //to be extended
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
		messages: {
			type: [MessageSchema],
			required: true
		},
    request: {
        type: RequestSchema,
        required: false
    }
});

TransactionSchema.index({name: "text"});
export default mongoose.model("Transactions", TransactionSchema);
