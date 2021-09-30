# Mongoose Basics

## Schemas

A "model" file looks like that (this is basically Item.js):

```
import mongoose from "mongoose"

const ItemSchema = mongoose.Schema({
    typeId: Number, // always works like <name>: <Structure> where <Structure> can be a simple type (like Number or String), an Array, or an Object that needs to be defined further
    location: {
        type: { type: String },
        coordinates: [] //You could also specify it as [Number], so the Array Elements need to be numbers
    },
    user: {
        type: mongoose.Schema.Types.ObjectId, // relation (see later)
        ref: 'User',
        required: true
    }
});

export default mongoose.model("Item", ItemSchema); //export as model
```

The model corresponds to a collection in MongoDB, and in the collection are instances of the ItemSchema.

(Maybe explain async-await Syntax if not known already)

Important functions:

```
import Item from "../models/Item.js"

...async...
try {
    const newItem = await Item.create({typeId: 10, location: user.location, user: user._id});
    const updatedItem = await Item.updateOne({_id: itemId}, {location: user.location}); //same for updatemany
    const replacedItem = await Item.replaceOne({_id: itemId}, newItem); //not sure about replaceMany
    const item = await Item.findOne({_id: itemId}) // or Item.findById(itemId)
    const items = await Item.find({typeId: 10})
    await Item.deleteMany({user: user._id}) //deleteOne also exists
} catch(err) {...}
```

## References

In model:
```
user: {
        type: mongoose.Schema.Types.ObjectId, // relation (see later)
        ref: 'User',
        required: true
    }
```
User side:
```
items: [{type: mongoose.Schema.Types.ObjectId, ref: "Items"}]
```

populate:

```
await User.find({location: {$geoWithin: { $centerSphere: [location.coordinates, maxDistance]}}}).populate([{path: "items", model: "Item", select: ["typeId"]}]);
await Item.find({$and: [{typeId: req.body.typeId}, {location: {$geoWithin: { $centerSphere: [req.body.location.coordinates, maxDistance]}}}]}).populate([{path: 'user', model: 'User', select: ['name', 'mail', 'address', 'location', 'apnTokens']}]);
```

There are more query operators like $in, $all, $neq (not 100% sure about names) and others I don't know, so just google. ;)


