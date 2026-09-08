import "dotenv/config";
import express from "express";
import { connectToDatabase } from "./db";
import cros from "cors";
import morgan from "morgan";
import { ok } from "./utils/envelope";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { clerkMiddleware } from "@clerk/express";
import { authRouter } from "./routes/auth/auth.routes";
import { adminProductRouter } from "./routes/admin/product.routes";
import { customerProductRouter } from "./routes/customer/product.routes";
import { adminPromoRouter } from "./routes/admin/promo.routes";
import { customerAddressRouter } from "./routes/customer/address.routes";
import { customerPromoRouter } from "./routes/customer/promo.routes";
import { customerCartWishlistRouter } from "./routes/customer/cart-wishlist.routes";
import { customerCheckoutRouter } from "./routes/customer/checkout.routes";

async function mainEntryFunction() {
  await connectToDatabase();

  const app = express();

  const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(
    cros({
      origin: corsOrigins,
      credentials: true,
    }),
  );

  app.use(express.json());
  app.use(morgan("dev"));
  app.use(clerkMiddleware());

  app.get("/health", (_req, res) =>
    res.json(ok({ message: "server is healthy" })),
  );

  //Auth
  app.use("/auth", authRouter);

  //Customer
  app.use("/customer", customerProductRouter);
  app.use("/customer", customerAddressRouter);
  app.use("/customer", customerPromoRouter);
  app.use("/customer", customerCartWishlistRouter);
  app.use("/customer", customerCheckoutRouter);

  //Admin
  app.use("/admin", adminProductRouter);
  app.use("/admin", adminPromoRouter);

  app.use(notFound);
  app.use(errorHandler);

  const port = Number(process.env.PORT) || 5000;
  app.listen(port, () => console.log(`server is running on port ${port}`));
}

mainEntryFunction().catch((err) => {
  console.log(err);
  process.exit(1);
});
