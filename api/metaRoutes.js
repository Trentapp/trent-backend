import express from "express"

import productsRouter from "./routes/productRoutes.js"
import userRouter from "./routes/userRoutes.js"
import reviewRouter from "./routes/reviewRoutes.js"

const router = express.Router();

router.use("/products", productsRouter);
router.use("/users", userRouter);
router.use("/reviews", reviewRouter);

export default router;
