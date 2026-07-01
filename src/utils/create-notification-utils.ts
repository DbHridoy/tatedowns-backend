import { Notification } from "../modules/common/notification.model";
import { Document } from "mongoose";
import User from "../modules/user/user.model";

// Define the input type for creating a notification
interface CreateNotificationInput {
  type: string;
  message: string;
  forUser: string;
}

// Function to create a notification
export const createNotification = async (
  input: CreateNotificationInput
): Promise<Document> => {
  const { forUser, type, message } = input;

  const newNotification = new Notification({ forUser, type, message });
  return await newNotification.save();
};

interface CreateNotificationsForUsersInput {
  type: string;
  message: string;
  userIds: string[];
}

export const createNotificationsForUsers = async (
  input: CreateNotificationsForUsersInput
) => {
  const { type, message, userIds } = input;
  if (!userIds || userIds.length === 0) {
    return [];
  }
  const payload = userIds.map((userId) => ({
    forUser: userId,
    type,
    message,
  }));
  return Notification.insertMany(payload);
};

export const createNotificationsForRole = async (
  role: "Admin" | "Sales Rep" | "Production Manager" | "Painter",
  input: Omit<CreateNotificationsForUsersInput, "userIds">
) => {
  const users = await User.find({ role }).select("_id");
  const userIds = users.map((user) => user._id.toString());
  return createNotificationsForUsers({ ...input, userIds });
};

type AdminTrackedJobStatus =
  | "Downpayment Pending"
  | "DC Pending"
  | "DC Awaiting Approval"
  | "Pending Close";

export const createAdminNotificationForJobStatus = async (
  status: AdminTrackedJobStatus
) => {
  const payloadByStatus: Record<AdminTrackedJobStatus, { type: string; message: string }> = {
    "Downpayment Pending": {
      type: "downpayment_status_updated",
      message: "A job is pending downpayment",
    },
    "DC Pending": {
      type: "job_status_dc_pending",
      message: "A job is pending design consultation",
    },
    "DC Awaiting Approval": {
      type: "job_status_dc_pending",
      message: "A job is pending design consultation",
    },
    "Pending Close": {
      type: "job_status_pending_close",
      message: "A job was marked as Pending Close",
    },
  };

  return createNotificationsForRole("Admin", payloadByStatus[status]);
};
