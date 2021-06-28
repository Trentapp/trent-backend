import mongoose from "mongoose"

const TransactionSchema = mongoose.Schema({ //to be extended
    lender: {//maybe replace lender with lender.id and lender.username and do the same for borrower
      type: String,
      required: true
    },
	borrower: {//for clean code and understanding purpuses I would call everything that is an ID sth with id (e.g. here borrowerId)
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
	end_date:{
		type: Date,
		required: true
	},
	granted: {
		type: Number, // 0 means "no response yet", 1 means "rejected" (or cancelled) and 2 means "accepted"
		required: true
	},
	total_price: {
		type: Number,
		required: true
	}
});

TransactionSchema.index({name: "text"});
export default mongoose.model("Transactions", TransactionSchema);
