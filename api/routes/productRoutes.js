import express from "express"
import NodeGeocoder from "node-geocoder"
import dotenv from "dotenv"
import sharp from "sharp"
import multer from "multer"
import fs from "fs"

import Logger from "../../Logger.js"

import Product from "../models/Product.js"
import User from "../models/User.js"

const upload = multer({dest: "../uploads/"});

dotenv.config();
const options = {
    provider: "google",
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
};
const geocoder = NodeGeocoder(options);

const productsRouter = express.Router();

//// product stuff // Maybe we should rename everything to item instead of product. But we should take care of the database collection and it actually is not that important.

// the default prefix of every route in that file is /api/products
// getting products
productsRouter.get("/", async (req, res) => { //in the frontend, it should be called with such a query: .../products?name=Name&day_price_max=23
    //to access the right page, you can add to the query: .../products?page=2&productsPerPage=10 // maybe change pagination to "load more when you scroll down" later, but I'm not sure if we need to change it in the backend
    Logger.shared.log(`Querying for /products/ with ${req.params}`);
    const productsPerPage = req.query.productsPerPage ? parseInt(req.query.productsPerPage, 10) : 20;
    const page = req.query.page ? parseInt(req.query.page, 10) : 0;

    let filters = {};//actually we don't need filters here yet, so we can delete it, but later we may want to outsource the data access stuff into another file, so I let it in for now
    let queryConds = [{}];
    if (req.query.name) { //the search is raather strict, maybe make it somehow less strict in the future, but I think it is fine for now
        queryConds.push({ $text: { $search: req.query.name } });
        filters.name = req.query.name;
    }
    if (req.query.lat && req.query.lng) {
        queryConds.push({ location: { $geoWithin: { $centerSphere: [[req.query.lng, req.query.lat], 5/6371] } } }) // should be replaced with $near in production propably as maxDistance is otherwise in ° instead of m
    }
    if (req.query.day_price_max) {
        queryConds.push({ 'prices.perDay': { $lte: req.query.day_price_max } });
        filters.day_price_max = req.query.day_price_max;
    }
    if (req.query.hour_price_max) {
        queryConds.push({ 'prices.perHour': { $lte: req.query.hour_price_max } });
        filters.hour_price_max = req.query.hour_price_max;
    } // add more filter options later, like time, ... (maybe min_price xD)
    if (req.query.inventory_user_id) { //alternative: go through user.inventory (I think it is not that much more efficient)
        queryConds.push({ 'user._id': req.query.inventory_user_id });
    }
    try {
        //console.log(queryConds);
        const products = await Product.find({ $and: queryConds }).populate([{path:'user', model:'Users', select:['name']}]).skip(productsPerPage*page).limit(productsPerPage);//(other order may be slightly more efficient (populate at the end))
        res.status(200).json(products.map(product => ({_id: product._id, name: product.name, desc: product.desc, prices: product.prices, location: product.location, address: product.address, user: product.user, thumbnail: product.thumbnail})));
    } catch (e) {
        res.status(500).json({ message: e });
    }
});

// adding a new product
const getCoordinates = async (product) => {
    //extract the geocoordinates from address and add it to product
    try {
        const responseLoc = await geocoder.geocode(`${product.address.street} ${product.address.houseNumber}, ${product.address.zipcode} ${product.address.city}, ${product.address.country}`); //may not need to be that detailed
        product['location.coordinates'] = [responseLoc[0].longitude, responseLoc[0].latitude];
        product['location.type'] = "Point";
        return product;
    } catch (e) {
        Logger.shared.log(`Getting coordinated for products failed: ${e}`)
        console.log(`Failed to find coordinates of address: ${e}`, 1);
    }
};

// generating product thumbnail
const getThumbnail = (product) => {
    if (product['pictures'] == undefined) { return product }
    if (product['pictures'].length === 0) { return product }
    // return product
    const image = product['pictures'][0];

    let parts = base64Image.split(';');
    let mimType = parts[0].split(':')[1];
    let imageData = parts[1].split(',')[1];

    var img = new Buffer(imageData, 'base64');
    sharp(img)
        .resize(64, 64)
        .toBuffer()
        .then(resizedImageBuffer => {
            let resizedImageData = resizedImageBuffer.toString('base64');
            let resizedBase64 = `data:${mimType};base64,${resizedImageData}`;
            product['thumbnail'] = resizedBase64
            return product;
        })
}

// productsRouter.post("/create", async (req, res) => {
//     try {
//         let product = req.body.product; // I would add uid to product before making the request and pass the product directly as req.body
//         //please make sure that req.body.product already contains the uid, so it is also added to product.
//         if (!req.body.user_uid) { throw "No user uid" }
//         const user = await User.findOne({ uid: req.body.user_uid });
//         const user_id = user._id;
//         if (!user_id) { throw "User uid not found" }
//
//         product = await getCoordinates(product);
//         product["user"] = user_id;
//         // product = getThumbnail(product);
//         const newProduct = await Product.create(product);
//
//         await User.updateOne({ _id: user_id }, { $push: { inventory: newProduct._id } });
//
//         res.status(200).json({ status: "success", productId: newProduct._id });
//     } catch (e) {
//         res.status(500).json({ message: e });
//     }
// });


productsRouter.post("/create2", upload.any(), upload.single("body"), async (req,res) => { //first uploading all images and then one blob product (like json)
  Logger.shared.log(`Uploading new product started`)
    try {
        const images = [];
        let product, body;
        for (const file of req.files){
            if (file.fieldname == "product"){
                body = JSON.parse(fs.readFileSync(file.path).toString());
                product = body.product;
                Logger.shared.log(`Creating new product: ${req.body.product}`);
            } else if (file.fieldname == "image"){
                Logger.shared.log(`Received image for product: ${req.body.product.name}`);
                images.push({data: fs.readFileSync(file.path), contentType: file.mimetype});
            }
        }
        const user = await User.findOne({ uid: body.user_uid });
        if (!user._id) { Logger.shared.log(`User uid not found`, 1); throw "User uid not found"; }
        product["user"] = user._id;

        product.pictures = images;
        product = await getCoordinates(product);
        //product = getThumbnail(product);
        const newProduct = await Product.create(product);
        await User.updateOne({ _id: user._id }, { $push: { inventory: newProduct._id } });
        Logger.shared.log(`Successfully created product: ${req.body.product.name} with id ${newProduct._id}`);
        res.status(200).json({status: "success", productId: newProduct._id});
    } catch(e) {
        console.log("Error in post product: ", e);
        Logger.shared.log(`Could not create prodcut: ${req.body.product.name}: {e}`, 1);
        res.status(500).json({message:e});
    }
});

//get a specific product
productsRouter.get("/product/:productId", async (req, res) => {
    try {
        Logger.shared.log(`Requesting product with id ${req.params.productId}`);
        const product = await Product.findById(req.params.productId).populate([{path:'user', model:'Users', select:['name']}]);
        res.status(200).send(product);
    } catch (e) {
        Logger.shared.log(`Requesting product with id ${req.params.productId} failed: ${e}`, 1);
        res.status(500).json({ message: e });
    }
});

//delete a specific product
productsRouter.delete("/product/delete/:productId", async (req, res) => {
    try {
        Logger.shared.log(`Deleting product with id ${req.params.productId}`);
        const product = await Product.findById(req.params.productId).populate([{path:'user', model:'Users', select:['name']}]);
        const user = await User.findOne({uid: req.body.uid});
        if (user._id != product.user._id) {
            Logger.shared.log(`User deleting product with id ${req.params.productId} could not be verified`, 1);
            throw "incorrect user identification";
        } else {
            await User.updateOne({ _id: product.user._id }, { $pullAll: { inventory: [req.params.productId] } });
            await Product.deleteOne({ _id: req.params.productId });
        }
        Logger.shared.log(`Successfully deleted product with id ${req.params.productId}`);
        res.status(200).json({ status: "success" });
    } catch (e) {
        Logger.shared.log(`Deleting product with id ${req.params.productId} failed: ${e}`, 1);
        res.status(500).json({ message: e });
    }
});

//Update a specific product
productsRouter.put("/product/update/:productId", upload.any(), upload.single("product"), async (req, res) => {
    try {
        Logger.shared.log(`Updating product with id ${req.params.productId}`);
        const images = [];
        let product, body;
        for (const file of req.files){
            if (file.fieldname == "product"){
                body = JSON.parse(fs.readFileSync(file.path).toString());
                product = body.product;
            } else if (file.fieldname == "image"){
                images.push({data: fs.readFileSync(file.path), contentType: file.mimetype});
            }
        }
        const user = await User.findOne({uid: body.user_uid}); // add uid later
        const oldProduct = await Product.findOne({_id: req.params.productId}).populate([{path:'user', model:'Users', select:['name']}]);
        if (JSON.stringify(user._id) != JSON.stringify(oldProduct.user._id)){
            Logger.shared.log(`User updating product with id ${req.params.productId} could not be verified`, 1);
            throw "incorrect user identification";
        }
        product["user"] = user._id
        product.pictures = images;
        product = await getCoordinates(product);//take care that it breaks out of the try and goes into catch when getCoordinates failed
        await Product.replaceOne({ _id: req.params.productId }, product);
        Logger.shared.log(`Successfully updated product with id ${req.params.productId}`);
        res.status(200).json({ status: "success" }); // maybe rather return the edited product, but Product.replaceOne does not return that.
    } catch (e) {
        Logger.shared.log(`Updating product with id ${req.params.productId} failed: ${e}`, 1);
        res.status(500).json({ message: e });
    }
});

export default productsRouter;
