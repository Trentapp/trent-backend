import mongoose from "mongoose"

const TransactionSchema = mongoose.Schema({ //to be extended
    lender: {//maybe replace lender with lender.id and lender.username and do the same for borrower
      type: mongoose.Schema.ObjectId,
      ref: 'Users',
      required: true
    },
	borrower: {//for clean code and understanding purpuses I would call everything that is an ID sth with id (e.g. here borrowerId)
      type: mongoose.Schema.ObjectId,
      ref: 'Users',
      required: true
    },
	item: {
      type: mongoose.Schema.ObjectId,
      ref: 'Products',
      required: true
    },
	startDate: {
		type: Date,
		required: true
	},
	endDate:{
		type: Date,
		required: true
	},
	granted: { //maybe rename granted (to status or so)
		type: Number, // 0 means "no response yet", 1 means "rejected" (or cancelled) and 2 means "accepted" // (or should we do an extra state for cancelled by user?)
		required: true
	},
	totalPrice: {
		type: Number,
		required: true
	}
});

TransactionSchema.index({name: "text"});
export default mongoose.model("Transactions", TransactionSchema);
