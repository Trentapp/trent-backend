import express from "express"

import userRouter from "./routes/userRoutes.js"
import reviewRouter from "./routes/reviewRoutes.js"
// import transactionRouter from "./routes/transactionRoutes.js"
// import chatRouter from "./routes/chatRoutes.js"
import paymentRouter from "./routes/paymentRoutes.js"
import itemsRouter from "./routes/itemRoutes.js"

const router = express.Router();

router.use("/items", itemsRouter);
router.use("/users", userRouter);
router.use("/reviews", reviewRouter);
// router.use("/transactions", transactionRouter);
// router.use("/chats", chatRouter);
router.use("/payment", paymentRouter);

export default router;
