import { HashUtils } from "./utils/hash-utils";
import { JwtUtils } from "./utils/jwt-utils";
import { Mailer } from "./utils/mailer-utils";
import { CommonRepository } from "./modules/common/common.repository";
import { CommonService } from "./modules/common/common.service";
import { CommonController } from "./modules/common/common.controller";
import { UserRepository } from "./modules/user/user.repository";
import { UserService } from "./modules/user/user.service";
import { UserController } from "./modules/user/user.controller";
import { AuthMiddleware } from "./middlewares/auth.middleware";
import { ClientRepository } from "./modules/client/client.repository";
import { ClientService } from "./modules/client/client.service";
import { ClientController } from "./modules/client/client.controller";
import { AuthRepository } from "./modules/auth/auth.repository";
import { AuthService } from "./modules/auth/auth.service";
import { AuthController } from "./modules/auth/auth.controller";
import { ExpenseRepository } from "./modules/expense/expense.repository";
import { ExpenseService } from "./modules/expense/expense.service";
import { ExpenseController } from "./modules/expense/expense.controller";
import { JobRepository } from "./modules/job/job.repository";
import { JobService } from "./modules/job/job.service";
import { JobController } from "./modules/job/job.controller";
import { QuoteRepository } from "./modules/quote/quote.repository";
import { QuoteService } from "./modules/quote/quote.service";
import { QuoteController } from "./modules/quote/quote.controller";
import { buildDynamicSearch } from "./utils/dynamic-search-utils";
import { SalesRepRepository } from "./modules/sales-rep/sales-rep.repository";
import { ProductionManagerRepository } from "./modules/production-manager/production-manager.repository";

export const hashUtils = new HashUtils();
export const jwtUtils = new JwtUtils();
export const mailer = new Mailer();

export const commonRepository = new CommonRepository();

export const userRepository = new UserRepository(buildDynamicSearch);
export const userService = new UserService(userRepository, hashUtils, mailer);
export const userController = new UserController(userService);

export const clientRepo = new ClientRepository();
export const salesRepRepo = new SalesRepRepository();
export const productionManagerRepo = new ProductionManagerRepository();

export const authRepo = new AuthRepository();
export const authService = new AuthService(
  authRepo,
  userRepository,
  hashUtils,
  jwtUtils,
  mailer
);
export const authMiddleware = new AuthMiddleware(jwtUtils, userRepository);
export const authController = new AuthController(authService);

export const expenseRepository = new ExpenseRepository();

export const quoteRepository = new QuoteRepository();
export const jobRepository = new JobRepository();
export const jobService = new JobService(
  jobRepository,
  salesRepRepo,
  quoteRepository,
  clientRepo
);
export const jobController = new JobController(jobService);

export const quoteService = new QuoteService(
  quoteRepository,
  salesRepRepo,
  clientRepo,
  jobRepository
);
export const commonService = new CommonService(
  commonRepository,
  salesRepRepo,
  productionManagerRepo
);
export const commonController = new CommonController(commonService, commonRepository);
export const expenseService = new ExpenseService(
  expenseRepository,
  commonService
);
export const clientService = new ClientService(clientRepo, salesRepRepo, commonService);
export const clientController = new ClientController(clientService);
export const expenseController = new ExpenseController(expenseService);
export const quoteController = new QuoteController(quoteService);
