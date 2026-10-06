"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AddAdministratorFormProps = {
  schoolId: string;
};

export default function AddAdministratorForm({
  schoolId,
}: AddAdministratorFormProps) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch("/api/administrators", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          schoolId,
          name,
          email,
          phone,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to create School Administrator"
        );
        return;
      }

      setName("");
      setEmail("");
      setPhone("");
      setPassword("");

      setSuccess(
        "School Administrator created successfully."
      );

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
        onClick={() => {
          setOpen(true);
          setError("");
          setSuccess("");
        }}
        className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
      >
        Add Administrator
      </button>
    );
  }

  return (
    <div className="w-full max-w-xl rounded-2xl bg-slate-50 p-6 ring-1 ring-slate-200">
      <div className="mb-6">
        <h4 className="text-xl font-bold text-slate-900">
          Add School Administrator
        </h4>

        <p className="mt-1 text-sm text-slate-500">
          Create an administrator account for this school.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="administrator-name"
            className="mb-1 block text-sm font-medium"
          >
            Full Name *
          </label>

          <input
            id="administrator-name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
            placeholder="Enter administrator name"
          />
        </div>

        <div>
          <label
            htmlFor="administrator-email"
            className="mb-1 block text-sm font-medium"
          >
            Email *
          </label>

          <input
            id="administrator-email"
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            required
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
            placeholder="administrator@example.com"
          />
        </div>

        <div>
          <label
            htmlFor="administrator-phone"
            className="mb-1 block text-sm font-medium"
          >
            Phone
          </label>

          <input
            id="administrator-phone"
            type="tel"
            value={phone}
            onChange={(event) =>
              setPhone(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
            placeholder="e.g. 0712345678"
          />
        </div>

        <div>
          <label
            htmlFor="administrator-password"
            className="mb-1 block text-sm font-medium"
          >
            Password *
          </label>

          <input
            id="administrator-password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            required
            minLength={8}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600"
            placeholder="Minimum 8 characters"
          />

          <p className="mt-1 text-xs text-slate-500">
            The password must contain at least 8 characters.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {success}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? "Creating..."
              : "Create Administrator"}
          </button>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setError("");
              setSuccess("");
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