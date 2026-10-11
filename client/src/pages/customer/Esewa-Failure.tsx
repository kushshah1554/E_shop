import { useEffect, useRef, useState } from "react";
import { Loader2, XCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { failEsewaCheckout } from "../../features/customer/cart-and-checkout/api";
import { ESEWA_PENDING_TRANSACTION_KEY } from "../../features/customer/cart-and-checkout/store";

const pageWrapClass =
  "flex min-h-screen items-center justify-center bg-background px-4";
const cardClass =
  "w-full max-w-xl space-y-5 border border-border bg-card p-8 text-center";
const iconWrapClass =
  "mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive";
const titleClass = "text-2xl font-semibold text-foreground";
const textClass = "text-sm text-muted-foreground";
const buttonRowClass = "flex flex-col gap-3 sm:flex-row sm:justify-center";
const buttonClass = "rounded-none";

type ReportState =
  | { status: "reporting" }
  | { status: "failed" }
  | { status: "error"; message: string };

export default function CustomerEsewaFailurePage() {
  const { search } = useLocation();
  const [state, setState] = useState<ReportState>({ status: "reporting" });
  const startedRef = useRef(false);

  const params = new URLSearchParams(search);
  // eSewa usually redirects to failure_url without query params, so fall
  // back to the transaction stashed by the checkout flow.
  const transactionUuid =
    params.get("transaction_uuid") ||
    params.get("transactionUuid") ||
    window.sessionStorage.getItem(ESEWA_PENDING_TRANSACTION_KEY) ||
    "";
  const reportedStatus = params.get("status") || "";

  useEffect(() => {
    // React strict mode re-runs effects; the failure must only be reported once.
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    async function report() {
      const isComplete = reportedStatus.toUpperCase() === "COMPLETE";

      if (!transactionUuid || isComplete) {
        // Either there is nothing to report (no session was created) or the
        // payment actually went through and the success flow handles it.
        if (!cancelled) setState({ status: "failed" });
        return;
      }

      try {
        await failEsewaCheckout({ transaction_uuid: transactionUuid });

        // The pending order is marked failed now; drop the stash so a later
        // failure page load doesn't re-report it.
        window.sessionStorage.removeItem(ESEWA_PENDING_TRANSACTION_KEY);

        if (!cancelled) setState({ status: "failed" });
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to report payment failure",
          });
        }
      }
    }

    void report();

    return () => {
      cancelled = true;
    };
  }, [transactionUuid, reportedStatus]);

  return (
    <div className={pageWrapClass}>
      <div className={cardClass}>
        {state.status === "reporting" && (
          <>
            <div className={iconWrapClass}>
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>

            <div className="space-y-2">
              <h1 className={titleClass}>Payment failed</h1>
              <p className={textClass}>
                Updating your order after the failed eSewa payment.
              </p>
            </div>
          </>
        )}

        {state.status === "failed" && (
          <>
            <div className={iconWrapClass}>
              <XCircle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className={titleClass}>Payment failed</h1>
              <p className={textClass}>
                Your eSewa payment was not completed and no money was
                deducted. You can try checkout again.
              </p>
            </div>

            <div className={buttonRowClass}>
              <Button asChild className={buttonClass}>
                <Link to="/">Try again</Link>
              </Button>

              <Button asChild variant="outline" className={buttonClass}>
                <Link to="/collections">Continue shopping</Link>
              </Button>
            </div>
          </>
        )}

        {state.status === "error" && (
          <>
            <div className={iconWrapClass}>
              <XCircle className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h1 className={titleClass}>Payment failed</h1>
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
