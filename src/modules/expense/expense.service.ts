import { ExpenseRepository } from "./expense.repository";
import { CommonService } from "../common/common.service";
import {
  createNotification,
  createNotificationsForRole,
} from "../../utils/create-notification-utils";

export class ExpenseService {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly commonService: CommonService
  ) { }

  createNewMileage = async (mileageInfo: any) => {
    const variable = await this.commonService.getVariable();
    if (!variable) {
      throw new Error("Mileage rate not set");
    }
    const deduction = variable?.mileageRate * mileageInfo.totalMilesDriven;
    const newMileage = await this.expenseRepository.createNewMileage({
      ...mileageInfo,
      deduction,
    });
    await createNotificationsForRole("Admin", {
      type: "mileage_submitted",
      message: "A mileage log was submitted for review",
    });
    return newMileage;
  };

  getAllMileage = async (query: any) => {
    return await this.expenseRepository.getAllMileage(query);
  };

  getPendingMileage = async (query: any) => {
    return await this.expenseRepository.getPendingMileage(query);
  };

  getMyMileage = async (userId: string, query: any) => {
    return await this.expenseRepository.getMyMileage(userId, query);
  };

  getMileageById = async (id: string) => {
    return await this.expenseRepository.getMileageById(id);
  };

  updateMileage = async (mileageId: string, mileageInfo: any) => {
    const existingMileage = await this.expenseRepository.getMileageById(
      mileageId
    );
    const updatedMileage = await this.expenseRepository.updateMileage(
      mileageId,
      mileageInfo
    );
    const previousStatus = existingMileage?.data?.status?.toString();
    const nextStatus = updatedMileage?.status?.toString();
    const salesRepId = updatedMileage?.salesRepId?.toString();

    if (salesRepId && previousStatus !== nextStatus) {
      const type =
        nextStatus === "Approved"
          ? "mileage_approved"
          : nextStatus === "Rejected"
            ? "mileage_rejected"
            : "mileage_status_updated";
      await createNotification({
        forUser: salesRepId,
        type,
        message: `Your mileage log status changed from ${previousStatus || "N/A"} to ${nextStatus || "N/A"}`,
      });
    }

    return updatedMileage;
  };


}
