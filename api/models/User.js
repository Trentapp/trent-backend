import mongoose from "mongoose"
import {AddressSchema} from "./Product.js"
import {ImageSchema} from "./Product.js"

const UserSchema = mongoose.Schema({ //to be extended
    uid: {
      type: String,
      required: true
    },
    name: {
        type: String,
        required: true
    },
    mail: String,//I would use email instead of mail
    //picture: String,
    address: AddressSchema,
    inventory: [{type: mongoose.Schema.Types.ObjectId, ref: "Product"}], // are we using this currently?
    transactionsLender: [{type: mongoose.Schema.Types.ObjectId, ref: "Transaction"}],
    transactionsBorrower: [{type: mongoose.Schema.Types.ObjectId, ref: "Transaction"}],
    rating: Number,
    numberOfRatings: Number, //I think always updating rating and numberOfRatings as we currently do is dangerous in the case of some errors. We should rather establish a relation or so (reviews reference)
    picture: ImageSchema
});

UserSchema.index({name: "text"});
export default mongoose.model("User", UserSchema);
