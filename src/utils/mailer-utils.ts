import { email } from "zod";
import { env } from "../config/env";
import { transporter } from "../config/nodemailer";

export class Mailer {
  sendOtp = async (email: string, otp: number) => {
    await transporter.sendMail({
      from: `"Developer" <${env.GMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `
        <h3>Password Reset</h3>
        <p>Your OTP code is: <b>${otp}</b></p>
        <p>This code will expire in 5 minutes.</p>
      `,
    });
  };
  sendPassword=async(email:string,password:string)=>{
    await transporter.sendMail({
      from: `"Developer" <${env.GMAIL_USER}>`,
      to: email,
      subject: "Password for the dashboard login",
      html: `
        <h3>Password Reset</h3>
        <p>Your password is: <b>${password}</b></p>
        <p>Use this password to log into the dashboard</p>
      `,
    });
  }

  sendWebsiteClientCreatedAlert = async (payload: {
    clientName: string;
    phoneNumber: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    leadSource?: string;
  }) => {
    const {
      clientName,
      phoneNumber,
      email,
      address,
      city,
      state,
      zipCode,
      leadSource,
    } = payload;

    await transporter.sendMail({
      from: `"TTMPainting" <${env.GMAIL_USER}>`,
      to: env.ADMIN_EMAIL,
      subject: `New website client: ${clientName}`,
      html: `
        <h3>New client created from website</h3>
        <p>A new client was submitted through the website.</p>
        <table cellpadding="6" cellspacing="0" border="1" style="border-collapse: collapse;">
          <tr><td><b>Client Name</b></td><td>${clientName}</td></tr>
          <tr><td><b>Phone</b></td><td>${phoneNumber}</td></tr>
          <tr><td><b>Email</b></td><td>${email || "-"}</td></tr>
          <tr><td><b>Address</b></td><td>${address}</td></tr>
          <tr><td><b>City</b></td><td>${city}</td></tr>
          <tr><td><b>State</b></td><td>${state}</td></tr>
          <tr><td><b>Zip Code</b></td><td>${zipCode}</td></tr>
          <tr><td><b>Lead Source</b></td><td>${leadSource || "TTMPainting Website"}</td></tr>
        </table>
      `,
    });
  };
}
