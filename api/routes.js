// we may want to split this routes.js file into multiple route files later

import express, { query } from "express"
import Product from "./models/Product.js"
import NodeGeocoder from "node-geocoder"
import dotenv from "dotenv"

dotenv.config();
const options = {
    provider: "google",
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
};
const geocoder = NodeGeocoder(options);

const router = express.Router();

//just main message for testing
router.get("/", (req, res) => {
    res.send("Hello World");
});

//// product stuff // Maybe we should rename everything to item instead of product. But we should take care of the database collection and it actually is not that important.

// getting products
router.get("/products", async (req,res) => { //in the frontend, it should be called with such a query: .../products?name=Name&day_price_max=23
    //to access the right page, you can add to the query: .../products?page=2&productsPerPage=10 // maybe change pagination to "load more when you scroll down" later, but I'm not sure if we need to change it in the backend
    const productsPerPage = req.query.productsPerPage ? parseInt(req.query.productsPerPage, 10) : 10;
    const page = req.query.page ? parseInt(req.query.page, 10) : 0;

    let filters = {};//actually we don't need filters here yet, so we can delete it, but later we may want to outsource the data access stuff into another file, so I let it in for now
    let queryConds = [{}];
    if (req.query.name){ //the search is raather strict, maybe make it somehow less strict in the future, but I think it is fine for now
        queryConds.push({ $text: {$search: req.query.name} });
        filters.name = req.query.name;
    }
    if (req.query.day_price_max){
        queryConds.push({ 'prices.perDay' : {$lte: req.query.day_price_max}});
        filters.day_price_max = req.query.day_price_max;
    }
    if (req.query.hour_price_max){
        queryConds.push({ 'prices.perHour': {$lte: req.query.hour_price_max}});
        filters.hour_price_max = req.query.hour_price_max;
    } // add more filter options later, like location, time, ... (maybe min_price xD)
    try {
        const products = await Product.find({$and: queryConds}).skip(productsPerPage*page).limit(productsPerPage);
        res.status(200).json(products);
    } catch(e) {
        res.status(500).json({message: e});
    }
});

// adding a new product
const getCoordinates = async (product) => {
    //extract the geocoordinates from address and add it to product
    try {
        const responseLoc = await geocoder.geocode(`${product.address.street} ${product.address.houseNumber}, ${product.address.zipcode} ${product.address.city}, ${product.address.country}`); //may not need to be that detailed
        product['location'] = {lat: responseLoc[0].latitude, lng: responseLoc[0].longitude};
        return product;
    } catch (e) {
        console.log("Failed to find coordinates of address: ", e);
    }
};

// genaerating product thumbnail
const getThumbnail = async (product) => {
  if(product['pictures'] == []) { return product }
  product['thumbnail'] = product['pictures'][0]; //TODO: scaling
  return product;
}

router.post("/products/create", async (req,res) => {
    try {
        let product = req.body;
        product = await getCoordinates(product);
        product = getThumbnail(product);
        const newProduct = await Product.create(product);
        const savedProduct = await newProduct.save();
        res.status(200).json(savedProduct);
    } catch(e) {
        res.status(500).json({message:e});
    }
});

//get a specific product
router.get("/products/product/:productId", async (req,res) => {
    try {
        const product = await Product.findById(req.params.productId);
        res.status(200).json(product);
    } catch(e) {
        res.status(500).json({message: e});
    }
});

//delete a specific product
router.delete("/products/product/delete/:productId", async (req,res) => {
    try {
        const removedPost = await Product.deleteOne({_id: req.params.productId});
        res.status(200).json({status: "success"});
    } catch(e) {
        res.status(500).json({message: e});
    }
});

//Update a specific product
router.put("/products/product/update/:productId", async (req,res) => {
    try {
        let product = req.body;
        product = await getCoordinates(product);//take care that it breaks out of the try and goes into catch when getCoordinates failed
        await Product.replaceOne({_id: req.params.productId}, product);
        res.status(200).json({status: "success"}); // maybe rather return the edited product, but Product.replaceOne does not return that.
    } catch(e) {
        res.status(500).json({message: e});
    }
});


export default router;
