import mongoose from "mongoose"


export const AddressSchema = mongoose.Schema({
  streetWithNr: String,
  zipcode: String,
  city: String,
  country: String
});

export const ImageSchema = mongoose.Schema({
  data: Buffer,
  contentType: String,
});

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
    items: [{type: mongoose.Schema.Types.ObjectId, ref: "Items"}],//this is the inventory
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
