import mongoose from "mongoose"
import {AddressSchema} from "./Product.js"
import {ImageSchema} from "./Product.js"

const UserSchema = mongoose.Schema({ //to be extended
    uid: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    name: {
      type: String,
      default: function() {
        return this.firstName + " " + this.lastName;
      }
    },
    mail: String,//I would use email instead of mail
    //picture: String,
    address: AddressSchema,
    location: {
      type: { type: String },
      coordinates: []
    },
    items: [{type: mongoose.Schema.Types.ObjectId, ref: "Items"}],
    // inventory: [{type: mongoose.Schema.Types.ObjectId, ref: "Products"}],
    // transactionsLender: [{type: mongoose.Schema.Types.ObjectId, ref: "Transaction"}],
    // transactionsBorrower: [{type: mongoose.Schema.Types.ObjectId, ref: "Transaction"}],
    rating: Number,
    numberOfRatings: Number, //I think always updating rating and numberOfRatings as we currently do is dangerous in the case of some errors. We should rather establish a relation or so (reviews reference)
    picture: ImageSchema,
    apnTokens: [String],
    mangopayId: String,
    walletId: String,
    bankaccountId: String,
    deleted: {
        type: Boolean,
        default: false,
    }
});

UserSchema.index({name: "text"});
export default mongoose.model("User", UserSchema);
