"use client";

import { useState } from "react";

type ActivationExpiryFormProps = {
  schoolId: string;
  expiryDate: string | null;
  isActive: boolean;
};

export default function ActivationExpiryForm({
  schoolId,
  expiryDate,
  isActive,
}: ActivationExpiryFormProps) {
  const [date, setDate] = useState(
    expiryDate ? expiryDate.slice(0, 10) : ""
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isExpired =
    isActive &&
    expiryDate !== null &&
    new Date(expiryDate) < new Date();

  async function saveExpiryDate() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/schools/${schoolId}/activation-expiry`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            expiryDate: date,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Failed to update the expiry date."
        );
        return;
      }

      setMessage(
        data.message || "Expiry date updated successfully."
      );

      window.location.reload();
    } catch (error) {
      console.error(
        "Activation expiry update error:",
        error
      );

      setError(
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div>
        <h4 className="font-semibold text-slate-900">
          Activation Expiry & Renewal
        </h4>

        <p className="mt-1 text-sm text-slate-500">
          Set or extend the date until which this school's
          activation remains valid.
        </p>
      </div>

      {isExpired && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 ring-1 ring-red-200">
          <p className="font-semibold text-red-800">
            This school's activation has expired.
          </p>

          <p className="mt-1 text-sm text-red-700">
            Select a future expiry date below to restore school
            management access.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="activation-expiry-date"
            className="block text-sm font-medium text-slate-700"
          >
            New Expiry Date
          </label>

          <input
            id="activation-expiry-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <button
          type="button"
          onClick={saveExpiryDate}
          disabled={loading || !date}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Saving..."
            : isExpired
              ? "Renew Activation"
              : "Save Expiry Date"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        {date && (
          <button
            type="button"
            onClick={() => setDate("")}
            disabled={loading}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Clear expiry date
          </button>
        )}
      </div>

      {message && (
        <p className="mt-3 text-sm font-medium text-green-700">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}