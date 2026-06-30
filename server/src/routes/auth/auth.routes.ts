import { Router } from "express";
import { requireAuth } from "../../middleare/auth";
import { clerkClient, getAuth } from "@clerk/express";
import { asyncHandler } from "../../utils/asyncHandler";
import { AppError } from "../../utils/AppError";
import { User } from "../../models/User";
import { ok } from "../../utils/envelope";

export const authRouter = Router();

authRouter.post(
  "/sync",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new AppError(401, "User is not logged in. Means unauth user! !");
    }

    const clerkUser = await clerkClient.users.getUser(userId);

    const extractEmailFromUserInfo =
      clerkUser.emailAddresses.find(
        (item) => item.emailAddress === clerkUser.primaryEmailAddressId,
      ) || clerkUser.emailAddresses[0];

    const email = extractEmailFromUserInfo.emailAddress;

    const fullName = [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    const name = fullName || clerkUser.username;

    const raw = process.env.ADMIN_EMAILS || "";

    const adminEmails = new Set(
      raw
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    );

    const existingUser = await User.findOne({ clerkUserId: userId });
    const shouldBeAdmin = email ? adminEmails.has(email.toLowerCase()) : false;

    const nextRole =
      existingUser?.role === "admin"
        ? "admin"
        : shouldBeAdmin
          ? "admin"
          : existingUser?.role || "user";

    const newlyCreatedDbUser = await User.findOneAndUpdate(
      { clerkUserId: userId },
      {
        clerkUserId: userId,
        email,
        name,
        role: nextRole,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    res.status(200).json(
      ok({
        user: {
          id: newlyCreatedDbUser.id,
          clerkUserId: newlyCreatedDbUser.clerkUserId,
          email: newlyCreatedDbUser.email,
          name: newlyCreatedDbUser.name,
          role: newlyCreatedDbUser.role,
        },
      }),
    );
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { userId } = getAuth(req);

    if (!userId) {
      throw new AppError(401, "User is not logged in. Means unauth user! !");
    }

    const dbUser = await User.findOne({ clerkUserId: userId });
    if (!dbUser) {
      throw new AppError(404, "User is not found in the DB");
    }

    res.status(200).json(
      ok({
        user: {
          id: dbUser.id,
          clerkUserId: dbUser.clerkUserId,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
        },
      }),
    );
  }),
);
