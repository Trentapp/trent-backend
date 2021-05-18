// we may want to split this routes.js file into multiple route files later

import express from "express"
import Product from "./models/Product.js"

const router = express.Router();

//just main message for testing
router.get("/", (req, res) => {
    res.send("Hello World");
});

//// product stuff

// getting products
router.get("/products", async (req,res) => {
    try {
        const products = await Product.find().limit(10);
        res.status(200).json(products);
    } catch(e) {
        res.status(500).json({message: e});
    }
});

// adding a new product
router.post("/products/create", async (req,res) => {
    const product = new Product({
        name: req.body.name,
        desc: req.body.desc,
        price: req.body.price
    });

    try {
        const savedProduct = await product.save();
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
        const removedPost = await Product.remove({_id: req.params.productId});
        res.status(200).json({status: "success"});
    } catch(e) {
        res.status(500).json({message: e});
    }
});

//Update a specific product
router.patch("/products/product/update/:productId", async (req,res) => {
    try {
        const updatedProduct = await Product.updateOne({_id: req.params.productId}, 
            {$set: {
                name: req.body.name,
                desc: req.body.desc,
                price: {
                    perHour: req.body.price.perHour,
                    perDay: req.body.price.perDay,
                }
            }});
        res.status(200).json(updatedProduct);
    } catch(e) {
        res.status(500).json({message: e});
    }
});


export default router;
