import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import demoRequestsRouter from "./demoRequests";
import clientsRouter from "./clients";
import employeesRouter from "./employees";
import projectsRouter from "./projects";
import invoicesRouter from "./invoices";
import filesRouter from "./files";
import featureRequestsRouter from "./featureRequests";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(demoRequestsRouter);
router.use(clientsRouter);
router.use(employeesRouter);
router.use(projectsRouter);
router.use(invoicesRouter);
router.use(filesRouter);
router.use(featureRequestsRouter);
router.use(dashboardRouter);

export default router;
