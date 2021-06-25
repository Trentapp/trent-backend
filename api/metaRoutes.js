import express from "express"

import productsRouter from "./routes/productRoutes.js"
import userRouter from "./routes/userRoutes.js"
import reviewRouter from "./routes/reviewRoutes.js"
import transactionRouter from "./routes/transactionRoutes.js"
import chatRouter from "./routes/chatRoutes.js"

const router = express.Router();

router.use("/products", productsRouter);
router.use("/users", userRouter);
router.use("/reviews", reviewRouter);
router.use("/transactions", transactionRouter);
router.use("/chats", chatRouter);

export default router;
