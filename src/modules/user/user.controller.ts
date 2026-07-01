import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { logger } from "../../utils/logger";
import { UserService } from "./user.service";
import { HttpCodes } from "../../constants/status-codes";
import { apiError } from "../../errors/api-error";
import { Errors } from "../../constants/error-codes";
import { updateOtherRoleUserType } from "./user.type";
import {
  TypedRequestBody,
  TypedRequestBodyWithFile,
} from "../../types/request.type";
import { createUserType } from "./user.type";

export class UserController {
  constructor(private userService: UserService) { }
  createUser = asyncHandler(
    async (
      req: TypedRequestBody<createUserType>,
      res: Response,
      next: NextFunction
    ) => {
      const body = req.body;
      logger.info({ user: req.user, body }, "Creating user");
      const user = await this.userService.createUser(body);
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "User created successfully",
        data: user,
      });
    }
  );

  getAllUsers = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const query = req.query;
      const users = await this.userService.getAllUsers(query);
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "All users fetched successfully",
        data: users.data,
        total: users.total,
      });
    }
  );

  getUserById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const id = String(req.params.id);
      const user = await this.userService.getUserById(id);
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "User fetched successfully",
        data: user,
      });
    }
  );

  // getSalesReps=asyncHandler(async(req:Request,res:Response,next:NextFunction)=>{
  //   const salesReps=await this.userService.getSalesReps(req.query)
  //   res.status(HttpCodes.Ok).json({
  //       success:true,
  //       message:"Sales reps fetched successfully",
  //       data:salesReps.data,
  //       total:salesReps.total
  //   })
  // })

  deleteUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const id = String(req.params.id);
      const user = await this.userService.deleteUser(id);
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "User deleted successfully",
        data: user,
      });
    }
  );

  getMyProfile = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user?.userId;
      if (!userId) {
        throw new apiError(Errors.NotFound.code, Errors.NotFound.message);
      }
      const user = await this.userService.getUserProfile(userId);
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "User profile fetched successfully",
        data: user,
      });
    }
  );

  updateUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const id = String(req.params.id)
      const body = req.body
      const user = await this.userService.updateUser(id, body)
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "User updated successfully",
        data: user
      })
    }
  );

  updateMyProfile = asyncHandler(
    async (
      req: TypedRequestBodyWithFile<updateOtherRoleUserType>,
      res: Response,
      next: NextFunction
    ) => {
      const userId = req.user?.userId;
      const body = req.body;

      logger.info({ body }, "UserController.updateProfile")

      if (!userId) {
        throw new apiError(Errors.NotFound.code, Errors.NotFound.message);
      }

      // If a file is uploaded, attach its URL to the body
      if (req.file) {
        body.profileImage = req.file.fileUrl;
      }

      logger.info({ body }, "UserController.updateProfile")

      logger.info({ user: req.user, body }, "Updating user profile");

      const updatedUser = await this.userService.updateMyProfile(userId, body);

      res.status(HttpCodes.Ok).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    }
  );
}
