"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AddSchoolForm() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch("/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          code,
          email,
          phone,
          address,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create school");
        return;
      }

      setName("");
      setCode("");
      setEmail("");
      setPhone("");
      setAddress("");
      setOpen(false);

      router.refresh();
    } catch {
      setError("Could not connect to the server");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
      >
        Add School
      </button>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-slate-900">
          Add New School
        </h3>

        <p className="mt-1 text-sm text-slate-500">
          Register a new school on Digital School Hub.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="school-name"
            className="mb-1 block text-sm font-medium"
          >
            School Name *
          </label>

          <input
            id="school-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            placeholder="Enter school name"
          />
        </div>

        <div>
          <label
            htmlFor="school-code"
            className="mb-1 block text-sm font-medium"
          >
            School Code *
          </label>

          <input
            id="school-code"
            type="text"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.toUpperCase())
            }
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 uppercase outline-none focus:border-blue-600"
            placeholder="e.g. SCH001"
          />

          <p className="mt-1 text-xs text-slate-500">
            The school code must be unique.
          </p>
        </div>

        <div>
          <label
            htmlFor="school-email"
            className="mb-1 block text-sm font-medium"
          >
            Email
          </label>

          <input
            id="school-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            placeholder="school@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="school-phone"
            className="mb-1 block text-sm font-medium"
          >
            Phone
          </label>

          <input
            id="school-phone"
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            placeholder="e.g. 0712345678"
          />
        </div>

        <div>
          <label
            htmlFor="school-address"
            className="mb-1 block text-sm font-medium"
          >
            Address
          </label>

          <textarea
            id="school-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            placeholder="School location or address"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save School"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError("");
            }}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}