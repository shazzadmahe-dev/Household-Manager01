import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import rentRouter from "./rent";
import billsRouter from "./bills";
import expensesRouter from "./expenses";
import paymentsRouter from "./payments";
import chatRouter from "./chat";
import dashboardRouter from "./dashboard";

const router = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/rent", rentRouter);
router.use("/bills", billsRouter);
router.use("/expenses", expensesRouter);
router.use("/payments", paymentsRouter);
router.use("/chat", chatRouter);
router.use("/dashboard", dashboardRouter);

export default router;
