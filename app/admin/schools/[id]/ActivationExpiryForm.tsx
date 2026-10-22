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
    expiryDate ? expiryDate.slice(0, 10) : "",
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isExpired =
    expiryDate === null ||
    new Date(expiryDate).getTime() < Date.now();

  async function saveExpiryDate() {
    if (!date) {
      setError("Select an expiry date before saving.");
      setMessage("");
      return;
    }

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
          body: JSON.stringify({ expiryDate: date }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update the expiry date.");
        return;
      }

      setMessage(data.message || "Expiry date updated successfully.");
      window.location.reload();
    } catch (error) {
      console.error("Activation expiry update error:", error);
      setError("Unable to connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6 rounded-xl bg-slate-50 p-5 ring-1 ring-slate-200">
      <div>
        <h4 className="font-semibold text-slate-900">
          School Access Expiry
        </h4>

        <p className="mt-1 text-sm text-slate-600">
          The Platform Administrator controls this school's expiry date.
          Access is allowed only while the school is active and its expiry
          date has not passed. The selected date remains valid through the
          end of that day in Kenya time.
        </p>
      </div>

      {isExpired && (
        <div className="mt-4 rounded-lg bg-red-50 p-4 ring-1 ring-red-200">
          <p className="font-semibold text-red-800">
            {expiryDate === null
              ? "No expiry date has been assigned."
              : "This school's expiry date has passed."}
          </p>

          <p className="mt-1 text-sm text-red-700">
            {isActive
              ? "School access remains blocked until a valid expiry date is assigned."
              : "The school is inactive. Assign an expiry date here, then activate the school through the appropriate administrative workflow."}
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="activation-expiry-date"
            className="block text-sm font-medium text-slate-700"
          >
            Expiry Date
          </label>

          <input
            id="activation-expiry-date"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
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
              ? "Assign / Update Expiry"
              : "Save Expiry Date"}
        </button>
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