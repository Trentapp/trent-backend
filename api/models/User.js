import mongoose from "mongoose"
import {AddressSchema} from "./Product.js"

const UserSchema = mongoose.Schema({ //to be extended
    uid: {
      type: String,
      required: true
    },
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
    inventory: [String]
});

UserSchema.index({name: "text"});
export default mongoose.model("Users", UserSchema);
