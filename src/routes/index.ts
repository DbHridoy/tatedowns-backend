import { Router } from "express";
import userRoute from "../modules/user/user.route";
import authRoute from "../modules/auth/auth.route";
import clientRoute from "../modules/client/client.route";
import quoteRoute from "../modules/quote/quote.route";
import jobRoute from "../modules/job/job.route";
import expenseRoute from "../modules/expense/expense.route";
import commonRoute from "../modules/common/common.route";
import crewRoute from "../modules/crew/crew.route";
import productionCalendarRoute from "../modules/production-calendar/production-calendar.route";
import painterRoute from "../modules/painter/painter.route";

const appRouter = Router();

const moduleRoutes = [
  {
    path: "/auth",
    router: authRoute,
  },
  {
    path: "/users",
    router: userRoute,
  },
  {
    path: "/clients",
    router: clientRoute,
  },
  {
    path: "/quotes",
    router: quoteRoute,
  },
  {
    path: "/jobs",
    router: jobRoute,
  },
  {
    path: "/expenses",
    router: expenseRoute,
  },
  {
    path: "/common",
    router: commonRoute,
  },
  {
    path: "/crews",
    router: crewRoute,
  },
  {
    path: "/production-calendar",
    router: productionCalendarRoute,
  },
  {
    path: "/painters",
    router: painterRoute,
  },
];

moduleRoutes.forEach((route) => appRouter.use(route.path, route.router));

export default appRouter;
