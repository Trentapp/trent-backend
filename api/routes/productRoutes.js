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

//// product stuff // Maybe we should rename everything to product instead of product. But we should take care of the database collection and it actually is not that important.

// the default prefix of every route in that file is /api/products
// getting products
productsRouter.get("/", async (req, res) => { //in the frontend, it should be called with such a query: .../products?name=Name&dayPriceMax=23
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
        let maxDistance = 25/6371;
        if(req.query.maxDistance){
          maxDistance = req.query.maxDistance / 6371;
        }
        queryConds.push({ location: { $geoWithin: { $centerSphere: [[req.query.lng, req.query.lat], maxDistance] } } }) // should be replaced with $near in production propably as maxDistance is otherwise in ° instead of m
    }
    if (req.query.dayPriceMax) {
        queryConds.push({ 'prices.perDay': { $lte: req.query.dayPriceMax } });
        filters.dayPriceMax = req.query.dayPriceMax;
    }
    if (req.query.hourPriceMax) {
        queryConds.push({ 'prices.perHour': { $lte: req.query.hourPriceMax } });
        filters.hourPriceMax = req.query.hourPriceMax;
    } // add more filter options later, like time, ... (maybe min_price xD)
    if (req.query.inventoryUserId) { //alternative: go through user.inventory (I think it is not that much more efficient)
        queryConds.push({ 'user._id': req.query.inventoryUserId });
    }
    try {
        //console.log(queryConds);
        const products = await Product.find({ $and: queryConds }).populate([{path:'user', model:'User', select:['name']}]).skip(productsPerPage*page).limit(productsPerPage);//(other order may be slightly more efficient (populate at the end))
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

productsRouter.post("/create", upload.any(), upload.single("body"), async (req,res) => { //first uploading all images and then one blob product (like json)
  Logger.shared.log(`Uploading new product started`)
    try {
        const images = [];
        const fittedImages = [];
        const thumbnails = [];
        let thumbnail;
        let product, body;
        let firstImage = true;

        for (const file of req.files){
            if (file.fieldname == "product"){
                body = JSON.parse(fs.readFileSync(file.path).toString());
                product = body.product;
                Logger.shared.log(`Received product information successfully`);
            } else if (file.fieldname == "image"){
                images.push({data: fs.readFileSync(file.path), contentType: file.mimetype});
                const thumb = await convertPicture(file);
                thumbnails.push(thumb);
                fittedImages.push(await convertPicture2(file));
                if (firstImage) {
                    thumbnail = thumb;
                }
                firstImage = false;
            }
        }
        const user = await User.findOne({ uid: body.uid });
        if (!user._id) { Logger.shared.log(`User uid not found`, 1); throw "User uid not found"; }
        product["user"] = user._id;

        product.pictures = images;
        product.thumbnails = thumbnails;
        product.picturesFitted = fittedImages;
        if(images.length > 0){
          // let thumbnail = await getThumbnail(images[0]);
          product.thumbnail = thumbnail;
        }
        product = await getCoordinates(product);
        const newProduct = await Product.create(product);
        await User.updateOne({ _id: user._id }, { $push: { inventory: newProduct._id } });
        Logger.shared.log(`Successfully created product with id ${newProduct._id}`);
        res.status(200).json({status: "success", productId: newProduct._id});
    } catch(e) {
        console.log("Error in post product: ", e);
        Logger.shared.log(`Could not create product: ${e}`, 1);
        res.status(500).json({message:e});
    }
});

//get a specific product
productsRouter.get("/product/:productId", async (req, res) => {
    try {
        Logger.shared.log(`Requesting product with id ${req.params.productId}`);
        const product = await Product.findById(req.params.productId).populate([{path:'user', model:'User', select:['name', 'rating', 'numberOfRatings', 'picture']}]);
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
        const product = await Product.findById(req.params.productId).populate([{path:'user', model:'User', select:['name']}]);
        const user = await User.findOne({uid: req.body.uid});
        if (JSON.stringify(user._id) != JSON.stringify(product.user._id)) {
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
  // TODO: thumbnail
    try {
        Logger.shared.log(`Updating product with id ${req.params.productId}`);
        const images = [];
        const fittedImages = [];
        const thumbnails = [];
        let thumbnail;
        let product, body;
        let firstImage = true;
        for (const file of req.files){
            if (file.fieldname == "product"){
                body = JSON.parse(fs.readFileSync(file.path).toString());
                product = body.product;
            } else if (file.fieldname == "image"){
                images.push({data: fs.readFileSync(file.path), contentType: file.mimetype});
                const thumb = await convertPicture(file);
                thumbnails.push(thumb);
                fittedImages.push(await convertPicture2(file));
                if (firstImage) {
                    thumbnail = thumb;
                }
                firstImage = false;
            }
        }
        const user = await User.findOne({uid: body.uid}); // add uid later
        const oldProduct = await Product.findOne({_id: req.params.productId}).populate([{path:'user', model:'User', select:['name']}]);
        if (JSON.stringify(user._id) != JSON.stringify(oldProduct.user._id)){
            Logger.shared.log(`User updating product with id ${req.params.productId} could not be verified`, 1);
            throw "incorrect user identification";
        }
        product["user"] = user._id
        product.pictures = images;
        product.thumbnails = thumbnails;
        product.picturesFitted = fittedImages;
        if(images.length > 0){
          // let thumbnail = await getThumbnail(images[0]);
          product.thumbnail = thumbnail;
        }
        product = await getCoordinates(product);//take care that it breaks out of the try and goes into catch when getCoordinates failed
        await Product.replaceOne({ _id: req.params.productId }, product);
        Logger.shared.log(`Successfully updated product with id ${req.params.productId}`);
        res.status(200).json({ status: "success" }); // maybe rather return the edited product, but Product.replaceOne does not return that.
    } catch (e) {
        Logger.shared.log(`Updating product with id ${req.params.productId} failed: ${e}`, 1);
        res.status(500).json({ message: e });
    }
});

const convertPicture = async (file) => new Promise(resolve => {
  sharp(file.path)
  .metadata()
  .then( info => {
    sharp(file.path)
      .extract({ width: Math.min(info.width, info.height), height: Math.min(info.width, info.height), left: parseInt((info.width - Math.min(info.width, info.height)) / 2), top: parseInt((info.height - Math.min(info.width, info.height)) / 2) })
      .resize({ height:200, width:200})
      .toFile(file.path + "_thumb")
      .then(function(newFileInfo){
          let thumbnail = {data: fs.readFileSync(file.path + "_thumb"), contentType: file.mimetype};
          console.log("image ready");
          resolve(thumbnail);
      })
  })
});


const convertPicture2 = async (file) => new Promise(resolve => {
    sharp(file.path)
    .metadata()
    .then( info => {
      sharp(file.path)
        .resize({ height:600, width:800, fit: "contain"})
        .toFile(file.path + "_fitted")
        .then(function(newFileInfo){
            let thumbnail = {data: fs.readFileSync(file.path + "_fitted"), contentType: file.mimetype};
            console.log("image ready");
            resolve(thumbnail);
        })
    })
  });


export default productsRouter;
