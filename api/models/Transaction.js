import mongoose from "mongoose"

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

TransactionSchema.index({name: "text"});
export default mongoose.model("Transactions", TransactionSchema);
