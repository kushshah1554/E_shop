import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { verifyEsewaCheckout } from "../../features/customer/cart-and-checkout/api";
import { useCustomerCartAndCheckoutStore } from "../../features/customer/cart-and-checkout/store";

const pageWrapClass =
  "flex min-h-screen items-center justify-center bg-background px-4";
const cardClass =
  "w-full max-w-xl space-y-5 border border-border bg-card p-8 text-center";
const iconWrapClass =
  "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary";
const errorIconWrapClass =
  "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive";
const titleClass = "text-2xl font-semibold text-foreground";
const textClass = "text-sm text-muted-foreground";
const buttonRowClass = "flex flex-col gap-3 sm:flex-row sm:justify-center";
const buttonClass = "rounded-none";

type VerifyState =
  | { status: "verifying" }
  | { status: "success"; orderId: string }
  | { status: "error"; message: string };

type EsewaCallbackData = {
  transaction_code: string;
  status: string;
  total_amount: string | number;
  transaction_uuid: string;
  product_code: string;
  signed_field_names: string;
  signature: string;
};

function decodeEsewaData(data: string): EsewaCallbackData {
  const binary = atob(data);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes)) as EsewaCallbackData;
}

export default function CustomerEsewaSuccessPage() {
  const clearCart = useCustomerCartAndCheckoutStore((state) => state.clear);
  const [state, setState] = useState<VerifyState>({ status: "verifying" });
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    async function verify() {
      const searchParams = new URLSearchParams(window.location.search);

      const data = searchParams.get("data");

      if (!data) {
        setState({
          status: "error",
          message: "Missing eSewa payment response",
        });
        return;
      }

      try {
        const callback = decodeEsewaData(data);

        if (
          !callback.transaction_uuid ||
          !callback.status ||
          !callback.signature
        ) {
          throw new Error("Invalid eSewa payment response");
        }

        const confirmed = await verifyEsewaCheckout({
          transaction_uuid: callback.transaction_uuid,
          status: callback.status,
          ref_id: callback.transaction_code,
        });

        if (!confirmed?._id) {
          throw new Error("Order confirmation failed");
        }

        clearCart();

        if (!cancelled) {
          setState({
            status: "success",
            orderId: confirmed._id,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to verify payment",
          });
        }
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [clearCart]);

  return (
    <div className={pageWrapClass}>
      <div className={cardClass}>
        {state.status === "verifying" && (
          <>
            <div className={iconWrapClass}>
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h1 className={titleClass}>Verifying payment</h1>
              <p className={textClass}>
                Confirming your eSewa payment. This only takes a moment.
              </p>
            </div>
          </>
        )}

        {state.status === "success" && (
          <>
            <div className={iconWrapClass}>
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className={titleClass}>Payment successful</h1>
              <p className={textClass}>
                Your eSewa payment is confirmed and your order is placed.
              </p>
            </div>

            <div className={buttonRowClass}>
              <Button asChild className={buttonClass}>
                <Link to="/collections">Continue shopping</Link>
              </Button>

              <Button asChild variant="outline" className={buttonClass}>
                <Link to="/">Go to home</Link>
              </Button>
            </div>
          </>
        )}

        {state.status === "error" && (
          <>
            <div className={errorIconWrapClass}>
              <XCircle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className={titleClass}>Payment verification failed</h1>
              <p className={textClass}>{state.message}</p>
            </div>

            <div className={buttonRowClass}>
              <Button
                className={buttonClass}
                onClick={() => window.location.reload()}
              >
                Try again
              </Button>

              <Button asChild variant="outline" className={buttonClass}>
                <Link to="/">Go to home</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
