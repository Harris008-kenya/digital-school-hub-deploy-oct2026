"use client";

import { FormEvent, useState } from "react";

type ActivationPaymentFormProps = {
  isActive: boolean;
};

export default function ActivationPaymentForm({
  isActive,
}: ActivationPaymentFormProps) {
  const [transactionCode, setTransactionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const code = transactionCode.trim().toUpperCase();

    if (!code) {
      setSuccess(false);
      setMessage("Please enter the M-PESA transaction code.");
      return;
    }

    if (code.length < 6) {
      setSuccess(false);
      setMessage("Please enter a valid M-PESA transaction code.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const response = await fetch("/api/activation-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionCode: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSuccess(false);
        setMessage(
          data.message || "Unable to submit activation payment."
        );
        return;
      }

      setSuccess(true);
      setMessage(
        data.message ||
          "Activation payment submitted successfully. Your payment is pending verification."
      );
      setTransactionCode("");
    } catch (error) {
      console.error("Activation payment submission error:", error);

      setSuccess(false);
      setMessage(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  if (isActive) {
    return (
      <div className="rounded-2xl bg-green-50 p-6 ring-1 ring-green-200">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
            ✓
          </div>

          <div>
            <h3 className="text-lg font-bold text-green-900">
              School Activated
            </h3>

            <p className="mt-1 text-sm text-green-800">
              Your school is currently active. No activation
              payment is required at this time.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-amber-50 p-6 ring-1 ring-amber-200">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-amber-700">
          School Activation
        </p>

        <h3 className="mt-2 text-2xl font-bold text-amber-950">
          Activate Your School
        </h3>

        <p className="mt-2 text-sm leading-6 text-amber-900">
          Your school is currently inactive. Pay the activation
          fee using normal M-PESA Send Money, then submit the
          transaction code below.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-white p-5 ring-1 ring-amber-200">
          <p className="text-sm font-medium text-slate-500">
            Activation Fee
          </p>

          <p className="mt-1 text-3xl font-bold text-slate-900">
            KSh 500
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 ring-1 ring-amber-200">
          <p className="text-sm font-medium text-slate-500">
            Send Money To
          </p>

          <p className="mt-1 text-2xl font-bold tracking-wide text-slate-900">
            0718528131
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Use normal M-PESA Send Money.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-white p-5 ring-1 ring-amber-200">
        <h4 className="font-bold text-slate-900">
          How to activate your school
        </h4>

        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Send <strong>KSh 500</strong> to{" "}
            <strong>0718528131</strong> using M-PESA Send Money.
          </li>

          <li>
            Keep the M-PESA confirmation message containing the
            transaction code.
          </li>

          <li>
            Enter the transaction code in the form below.
          </li>

          <li>
            Submit the payment for verification by the Platform
            Administrator.
          </li>

          <li>
            Your school will only become active after the payment
            has been manually verified and approved.
          </li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        <label
          htmlFor="activation-transaction-code"
          className="block text-sm font-semibold text-slate-800"
        >
          M-PESA Transaction Code
        </label>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            id="activation-transaction-code"
            type="text"
            value={transactionCode}
            onChange={(event) =>
              setTransactionCode(event.target.value.toUpperCase())
            }
            placeholder="e.g. QWE1234567"
            autoComplete="off"
            disabled={loading}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-mono text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          />

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Payment"}
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 rounded-lg p-4 text-sm ${
              success
                ? "bg-green-100 text-green-800 ring-1 ring-green-200"
                : "bg-red-100 text-red-800 ring-1 ring-red-200"
            }`}
          >
            {message}
          </div>
        )}
      </form>

      <p className="mt-4 text-xs leading-5 text-amber-800">
        <strong>Important:</strong> Entering a transaction code
        does not automatically activate the school. The payment
        must first be verified by the Platform Administrator.
      </p>
    </div>
  );
}