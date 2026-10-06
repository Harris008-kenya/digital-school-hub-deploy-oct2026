"use client";

import { useState } from "react";

type ActivationPaymentActionsProps = {
  paymentId: string;
  status: string;
};

export default function ActivationPaymentActions({
  paymentId,
  status,
}: ActivationPaymentActionsProps) {
  const [currentStatus, setCurrentStatus] = useState(status);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleAction(action: "APPROVE" | "REJECT") {
    const confirmation =
      action === "APPROVE"
        ? "Have you verified this KSh 500 payment in your M-PESA records? Click OK to approve and activate the school."
        : "Are you sure you want to reject this activation payment?";

    if (!window.confirm(confirmation)) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/activation-payment/${paymentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Unable to process the payment.");
        return;
      }

      setCurrentStatus(data.payment.status);
      setMessage(data.message || "Payment processed successfully.");

      window.location.reload();
    } catch (error) {
      console.error(
        "Activation payment action error:",
        error
      );

      setMessage(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (currentStatus !== "PENDING") {
    return (
      <div className="text-sm">
        {currentStatus === "APPROVED" ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            Approved
          </span>
        ) : (
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
            Rejected
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleAction("APPROVE")}
          disabled={loading}
          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Processing..." : "Approve"}
        </button>

        <button
          type="button"
          onClick={() => handleAction("REJECT")}
          disabled={loading}
          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Processing..." : "Reject"}
        </button>
      </div>

      {message && (
        <p className="max-w-xs text-xs text-slate-600">
          {message}
        </p>
      )}
    </div>
  );
}