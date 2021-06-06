import mongoose from "mongoose"
import {AddressSchema} from "./Product.js"

const UserSchema = mongoose.Schema({ //to be extended
    uid: {
      type: String,
      required: true
    },
    name: {
        type: String,
        required: true
    },
    mail: String,
    //picture: String,
    address: AddressSchema,
    inventory: [String] // I think actually you we should do it like: inventory: [{type: mongoose.Schema.Types.ObjectId, ref: "Products"}]
});

UserSchema.index({name: "text"});
export default mongoose.model("Users", UserSchema);
