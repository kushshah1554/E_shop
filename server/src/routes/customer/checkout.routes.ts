import { Router, type Request, type Response } from "express";
import { Types } from "mongoose";
import { Product, ProductSize } from "../../models/Product";
import { getDbUserFromReq, requireAuth } from "../../middleware/auth";
import { asyncHandler } from "../../utils/asyncHandler";
import { requireFound, requireText } from "../../utils/helpers";
import { User } from "../../models/User";
import { Cart } from "../../models/Cart";
import { AppError } from "../../utils/AppError";
import { Promo } from "../../models/Promo";
import { razorpay, toSubUnits } from "../../utils/razorpay";
import { Order, type OrderDocument } from "../../models/Order";
import { ok } from "../../utils/envelope";
import crypto, { randomUUID } from "node:crypto";

type PaymentMethod = "razorpay" | "esewa";

type UserAddressRow = {
  _id: Types.ObjectId;
  fullName: string;
  address: string;
  state: string;
  postalCode: string;
};

type CheckoutUserRow = {
  _id: Types.ObjectId;
  name?: string;
  email?: string;
  addresses: UserAddressRow[];
};

type CartRow = {
  items: Array<{
    product: Types.ObjectId;
    quantity: number;
    color?: string;
    size?: ProductSize;
  }>;
};

type ProductRow = {
  _id: Types.ObjectId;
  price: number;
  salePercentage: number;
  stock: number;
  status: "active" | "inactive";
};

type PromoRow = {
  code: string;
  percentage: number;
  count: number;
  minimumOrderValue: number;
  startsAt: Date;
  endsAt: Date;
};

export const customerCheckoutRouter = Router();

customerCheckoutRouter.use(requireAuth);

type EsewaStatusResponse = {
  ref_id?: string;
  status?: string;
  total_amount?: string | number;
  transaction_uuid?: string;
};

function getEsewaStatusUrl() {
  if (process.env.ESEWA_STATUS_URL) return process.env.ESEWA_STATUS_URL;

  const formUrl =
    process.env.ESEWA_FORM_URL ||
    "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

  return formUrl.includes("rc-")
    ? "https://rc.esewa.com.np/api/epay/transaction/status/"
    : "https://esewa.com.np/api/epay/transaction/status/";
}

// Shared post-payment bookkeeping: reserve stock, burn promo usage,
// clear the cart and mark the order as paid.
async function settlePaidOrder(
  order: OrderDocument,
  userId: Types.ObjectId,
  opts: { paymentId: string; esewaTransactionCode?: string },
) {
  for (const item of order.items) {
    const updated = await Product.updateOne(
      {
        _id: item.product,
        stock: { $gte: item.quantity },
      },
      {
        $inc: { stock: -item.quantity },
      },
    );

    if (!updated.matchedCount) {
      throw new AppError(400, "One or more cart items are out of stock");
    }
  }

  if (order.promoCode) {
    await Promo.updateOne(
      {
        code: order.promoCode,
        count: { $gt: 0 },
      },
      {
        $inc: { count: -1 },
      },
    );
  }

  await Cart.updateOne({ user: userId }, { $set: { items: [] } });

  order.paymentStatus = "paid";
  order.paymentId = opts.paymentId;

  if (opts.esewaTransactionCode) {
    order.esewaTransactionCode = opts.esewaTransactionCode;
  }

  order.paidAt = new Date();
  await order.save();
}

customerCheckoutRouter.post(
  "/checkout/create-session",
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);
    const addressId = String(req.body.addressId || "").trim();
    const promoCode = String(req.body.promoCode || "")
      .trim()
      .toUpperCase();

    const paymentMethod = String(req.body.paymentMethod || "razorpay")
      .trim()
      .toLowerCase() as PaymentMethod;

    if (!["razorpay", "esewa"].includes(paymentMethod)) {
      throw new AppError(400, "Invalid payment method");
    }

    requireText(addressId, "Address is required");

    //get user and cart info

    const [user, cart] = await Promise.all([
      User.findById(dbUser._id)
        .select("name email addresses")
        .lean<CheckoutUserRow | null>(),

      Cart.findOne({ user: dbUser._id }).select("items").lean<CartRow | null>(),
    ]);

    const foundUser = requireFound(user, "user not found", 404);
    const foundCart = requireFound(cart, "Cart not found", 404);

    if (!foundCart.items.length) {
      throw new AppError(400, "Cart is empty");
    }

    const selectedAddress = foundUser.addresses.find(
      (item) => String(item._id) === addressId,
    );

    if (!selectedAddress) {
      throw new AppError(404, "Address not found!!");
    }

    const products = await Product.find({
      _id: { $in: foundCart.items.map((item) => item.product) },
    })
      .select("price salePercentage stock status")
      .lean<ProductRow[]>();

    const productMap = new Map(
      products.map((item) => [String(item._id), item]),
    );

    let totalItems = 0;
    let subTotal = 0;

    const items = foundCart.items.map((cartItem) => {
      const product = productMap.get(String(cartItem.product));

      if (!product || product.status !== "active") {
        throw new AppError(400, "One or more cart items are not avaibale");
      }

      if (product.stock < cartItem.quantity) {
        throw new AppError(400, "Cart items are out of stock");
      }

      const finalPrice = product.salePercentage
        ? Math.round(
            product.price - (product.price * product.salePercentage) / 100,
          )
        : product.price;

      totalItems += cartItem.quantity;
      subTotal += finalPrice * cartItem.quantity;

      return {
        product: cartItem.product,
        quantity: cartItem.quantity,
      };
    });

    let appliedPromoCode = "";
    let discountAmount = 0;

    if (promoCode) {
      const promo = await Promo.findOne({ code: promoCode })
        .select("code percentage count minimumOrderValue startsAt endsAt")
        .lean<PromoRow | null>();

      const foundPromo = requireFound(promo, "Promo not found", 404);
      const now = new Date();

      if (
        now < foundPromo.startsAt ||
        now > foundPromo.endsAt ||
        foundPromo.count < 1
      ) {
        throw new AppError(400, "promo code is not active");
      }

      if (subTotal < foundPromo.minimumOrderValue) {
        throw new AppError(
          400,
          "Minimum order value for this promo is not at the threesold",
        );
      }

      appliedPromoCode = foundPromo.code;
      discountAmount = Math.round((subTotal * foundPromo.percentage) / 100);
    }

    const totalAmount = Math.max(subTotal - discountAmount, 0);

    const deliveryAddress = [
      selectedAddress.address,
      selectedAddress.state,
      selectedAddress.postalCode,
    ]
      .filter(Boolean)
      .join(", ");

    let razorpayOrderId = "";
    let esewaTransactionUuid = "";

    let paymentSession:
      | {
          method: "razorpay";
          keyId: string | undefined;
          orderId: string;
          amount: number;
          currency: string;
        }
      | {
          method: "esewa";
          formUrl: string;
          fields: Record<string, string>;
        };

    if (paymentMethod === "razorpay") {
      const razorpayOrder = await razorpay.orders.create({
        amount: toSubUnits(totalAmount),
        currency: "INR",
        receipt: `Order_${Date.now()}`,
      });

      razorpayOrderId = razorpayOrder.id;

      paymentSession = {
        method: "razorpay",
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: razorpayOrder.id,
        amount: Number(razorpayOrder.amount),
        currency: razorpayOrder.currency,
      };
    } else {
      // Configure these environment variables before enabling eSewa.
      const productCode = process.env.ESEWA_PRODUCT_CODE;
      const secretKey = process.env.ESEWA_SECRET_KEY;
      const successUrl = process.env.ESEWA_SUCCESS_URL;
      const failureUrl = process.env.ESEWA_FAILURE_URL;

      if (!productCode || !secretKey || !successUrl || !failureUrl) {
        throw new AppError(500, "eSewa is not configured");
      }

      // Unique identifier for this payment attempt.
      esewaTransactionUuid = randomUUID();

      const amount = totalAmount.toFixed(2);
      const taxAmount = "0";
      const serviceCharge = "0";
      const deliveryCharge = "0";

      const totalPayable = (
        Number(amount) +
        Number(taxAmount) +
        Number(serviceCharge) +
        Number(deliveryCharge)
      ).toFixed(2);

      const signedFieldNames = "total_amount,transaction_uuid,product_code";

      const signatureMessage =
        `total_amount=${totalPayable},` +
        `transaction_uuid=${esewaTransactionUuid},` +
        `product_code=${productCode}`;

      const signature = crypto
        .createHmac("sha256", secretKey)
        .update(signatureMessage)
        .digest("base64");

      paymentSession = {
        method: "esewa",
        formUrl:
          process.env.ESEWA_FORM_URL ||
          "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
        fields: {
          amount,
          tax_amount: taxAmount,
          total_amount: totalPayable,
          transaction_uuid: esewaTransactionUuid,
          product_code: productCode,
          product_service_charge: serviceCharge,
          product_delivery_charge: deliveryCharge,
          success_url: successUrl,
          failure_url: failureUrl,
          signed_field_names: signedFieldNames,
          signature,
        },
      };
    }

    const order = await Order.create({
      user: dbUser._id,
      customerName: foundUser.name || selectedAddress.fullName,
      customerEmail: foundUser.email || "",
      items,
      totalItems,
      deliveryName: selectedAddress.fullName,
      deliveryAddress,
      promoCode: appliedPromoCode,
      discountAmount,
      totalAmount,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "placed",
      razorpayOrderId,
      esewaTransactionUuid,
    });

    res.json(
      ok({
        paymentSession,
        order: {
          _id: String(order._id),
          totalItems,
          discountAmount,
          totalAmount,
        },
      }),
    );
  }),
);

customerCheckoutRouter.post(
  "/checkout/confirm",
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);
    const orderId = String(req.body.orderId || "").trim();
    const razorpayPaymentId = String(req.body.razorpay_payment_id || "").trim();
    const razorpayOrderId = String(req.body.razorpay_order_id || "").trim();
    const razorpaySignature = String(req.body.razorpay_signature || "").trim();

    requireText(orderId, "Order id is needed");
    requireText(razorpayPaymentId, "razorpayPaymentId is needed");
    requireText(razorpayOrderId, "razorpayOrderId is needed");
    requireText(razorpaySignature, "razorpaySignature is needed");

    const order = await Order.findOne({ _id: orderId, user: dbUser._id });
    const foundOrder = requireFound(order, "Order not found", 404);

    if (foundOrder.paymentMethod !== "razorpay") {
      throw new AppError(400, "This order does not use Razorpay");
    }

    if (foundOrder.paymentStatus === "paid") {
      res.json(ok({ _id: String(foundOrder._id) }));
      return;
    }

    if (foundOrder.razorpayOrderId !== razorpayOrderId) {
      throw new AppError(400, "Order id mismatch");
    }

    const signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "")
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (signature !== razorpaySignature) {
      throw new AppError(400, "Invalid payment signature");
    }

    await settlePaidOrder(foundOrder, dbUser._id, {
      paymentId: razorpayPaymentId,
    });

    res.json(ok({ _id: String(foundOrder._id) }));
  }),
);

// eSewa redirects the browser to ESEWA_SUCCESS_URL with transaction_uuid,
// product_code, total_amount and status in the query string. The client posts
// those params here and the payment is re-verified against eSewa's status API
// before the order is marked as paid.
customerCheckoutRouter.post(
  "/checkout/esewa/verify",
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);
    const transactionUuid = String(
      req.body.transaction_uuid || req.body.transactionUuid || "",
    ).trim();
    const refId = String(req.body.ref_id || "").trim();
    const reportedStatus = String(req.body.status || "")
      .trim()
      .toUpperCase();

    requireText(transactionUuid, "transaction_uuid is needed");

    if (reportedStatus && reportedStatus !== "COMPLETE") {
      throw new AppError(400, "eSewa payment was not completed");
    }

    const order = await Order.findOne({
      user: dbUser._id,
      esewaTransactionUuid: transactionUuid,
    });
    const foundOrder = requireFound(order, "Order not found", 404);

    if (foundOrder.paymentMethod !== "esewa") {
      throw new AppError(400, "This order does not use eSewa");
    }

    if (foundOrder.paymentStatus === "paid") {
      res.json(ok({ _id: String(foundOrder._id) }));
      return;
    }

    const productCode = process.env.ESEWA_PRODUCT_CODE;

    if (!productCode) {
      throw new AppError(500, "eSewa is not configured");
    }

    const statusUrl = new URL(getEsewaStatusUrl());
    statusUrl.searchParams.set("product_code", productCode);
    statusUrl.searchParams.set(
      "total_amount",
      Number(foundOrder.totalAmount).toFixed(2),
    );
    statusUrl.searchParams.set("transaction_uuid", transactionUuid);

    let esewaStatus: EsewaStatusResponse;

    try {
      const response = await fetch(statusUrl, { method: "GET" });
      esewaStatus = (await response.json()) as EsewaStatusResponse;
    } catch {
      throw new AppError(502, "Unable to verify payment with eSewa");
    }

    if (String(esewaStatus?.status || "").toUpperCase() !== "COMPLETE") {
      throw new AppError(400, "eSewa payment is not complete");
    }

    const paidAmount = Number(esewaStatus.total_amount);

    if (
      !Number.isNaN(paidAmount) &&
      paidAmount !== Number(foundOrder.totalAmount)
    ) {
      throw new AppError(400, "Payment amount mismatch");
    }

    const verifiedRefId = String(esewaStatus.ref_id || refId);

    await settlePaidOrder(foundOrder, dbUser._id, {
      paymentId: verifiedRefId,
      esewaTransactionCode: refId || verifiedRefId,
    });

    res.json(ok({ _id: String(foundOrder._id) }));
  }),
);

// eSewa redirects the browser to ESEWA_FAILURE_URL; the client posts the
// transaction_uuid here so the pending order is marked as failed. This is
// recoverable: if the payment actually went through, a later call to
// /checkout/esewa/verify still confirms it through eSewa's status API.
customerCheckoutRouter.post(
  "/checkout/esewa/failure",
  asyncHandler(async (req: Request, res: Response) => {
    const dbUser = await getDbUserFromReq(req);
    const transactionUuid = String(
      req.body.transaction_uuid || req.body.transactionUuid || "",
    ).trim();

    requireText(transactionUuid, "transaction_uuid is needed");

    const order = await Order.findOne({
      user: dbUser._id,
      esewaTransactionUuid: transactionUuid,
    });
    const foundOrder = requireFound(order, "Order not found", 404);

    if (foundOrder.paymentMethod !== "esewa") {
      throw new AppError(400, "This order does not use eSewa");
    }

    if (foundOrder.paymentStatus !== "paid") {
      foundOrder.paymentStatus = "failed";
      await foundOrder.save();
    }

    res.json(
      ok({
        _id: String(foundOrder._id),
        paymentStatus: foundOrder.paymentStatus,
      }),
    );
  }),
);
