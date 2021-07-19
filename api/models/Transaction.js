import mongoose from "mongoose"

const TransactionSchema = mongoose.Schema({ //to be extended
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
	product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
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
	status: { 
		type: Number,
		required: true
	},
	totalPrice: {
		type: Number,
		required: true
	}
});

TransactionSchema.index({name: "text"});
export default mongoose.model("Transaction", TransactionSchema);
