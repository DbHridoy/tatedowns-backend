import mongoose from "mongoose";
import connectDB from "../config/database";
import { env } from "../config/env";
import { hashUtils, userRepository } from "../container";

const seedAdmin = async () => {
  await connectDB(env.DB_URL);

  const existing = await userRepository.findUserByEmail(env.ADMIN_EMAIL);
  if (existing) {
    console.log("Admin user already exists:", env.ADMIN_EMAIL);
    return;
  }

  const hashedPassword = await hashUtils.hashPassword(env.ADMIN_PASSWORD);
  await userRepository.createUser({
    fullName: "Admin",
    email: env.ADMIN_EMAIL,
    role: "Admin",
    password: hashedPassword,
  });

  console.log("Admin user created:", env.ADMIN_EMAIL);
};

seedAdmin()
  .catch((error) => {
    console.error("Admin seeder failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
