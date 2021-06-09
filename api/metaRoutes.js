import express from "express"

import productsRouter from "./routes/productRoutes.js"
import userRoutes from "./routes/userRoutes.js"

const router = express.Router();

router.use("/products", productsRouter);
router.use("/users", userRoutes);

export default router;
