"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

type School = {
  id: string;
  name: string;
};

export default function LoginPage() {
  const router = useRouter();

  const [role, setRole] = useState("Student");

  const [schoolId, setSchoolId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [secondName, setSecondName] = useState("");
  const [admissionNumber, setAdmissionNumber] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [message, setMessage] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  async function loadSchools() {
    try {
      setLoadingSchools(true);
      setMessage("");

      const response = await fetch("/api/schools", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load registered schools");
      }

      const data = await response.json();

      const loadedSchools: School[] = Array.isArray(data)
        ? data
        : data.schools ?? [];

      setSchools(loadedSchools);
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load registered schools"
      );
    } finally {
      setLoadingSchools(false);
    }
  }

  function changeRole(newRole: string) {
    setRole(newRole);
    setMessage("");

    if (
      (newRole === "Student" || newRole === "Parent") &&
      schools.length === 0
    ) {
      loadSchools();
    }
  }

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    if (role === "Student") {
      if (
        !schoolId ||
        !firstName.trim() ||
        !secondName.trim() ||
        !admissionNumber.trim() ||
        !password
      ) {
        setMessage(
          "Please select your school and enter your first name, second name, admission number and password."
        );
        return;
      }

      setSigningIn(true);

      try {
        const response = await fetch("/api/auth/student-login", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schoolId,
            firstName: firstName.trim(),
            secondName: secondName.trim(),
            admissionNumber: admissionNumber.trim(),
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not sign in");
        }

        window.location.href = "/student";
      } catch (error) {
        console.error("Student login error:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not sign in"
        );
      } finally {
        setSigningIn(false);
      }

      return;
    }

    if (role === "Parent") {
      if (!schoolId || !phoneNumber.trim() || !password) {
        setMessage(
          "Please select your school and enter your phone number and password."
        );
        return;
      }

      setSigningIn(true);

      try {
        const response = await fetch("/api/parent/login", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            schoolId,
            phoneNumber: phoneNumber.trim(),
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not sign in");
        }

        router.push("/parent");
      } catch (error) {
        console.error("Parent login error:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not sign in"
        );
      } finally {
        setSigningIn(false);
      }

      return;
    }

    if (role === "Teacher") {
      if (!email.trim() || !password) {
        setMessage(
          "Please enter your registered email address and password."
        );
        return;
      }

      setSigningIn(true);

      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim(),
            password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not sign in");
        }

        router.push("/teacher");
      } catch (error) {
        console.error("Teacher login error:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not sign in"
        );
      } finally {
        setSigningIn(false);
      }

      return;
    }

    if (role === "Administrator") {
      if (!email.trim() || !password) {
        setMessage(
          "Please enter your email address and password."
        );
        return;
      }

      setSigningIn(true);

      try {
        const response = await fetch(
          "/api/auth/administrator-login",
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: email.trim(),
              password,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Could not sign in");
        }

        router.push(data?.administrator?.role === "BURSAR" ? "/bursar" : "/admin");
      } catch (error) {
        console.error(
          "Administrator login error:",
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "Could not sign in"
        );
      } finally {
        setSigningIn(false);
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <h1 className="text-2xl font-bold text-blue-700">
            Digital School Hub
          </h1>

          <p className="text-sm text-slate-500">
            Learn • Manage • Connect
          </p>
        </div>
      </header>

      <section className="flex min-h-[calc(100vh-90px)] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Welcome Back
            </h2>

            <p className="mt-2 text-slate-500">
              Login to your Digital School Hub account
            </p>
          </div>

          <div className="mt-8">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Login as
            </label>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => changeRole("Student")}
                className={
                  role === "Student"
                    ? "rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                }
              >
                Student
              </button>

              <button
                type="button"
                onClick={() => changeRole("Parent")}
                className={
                  role === "Parent"
                    ? "rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                }
              >
                Parent
              </button>

              <button
                type="button"
                onClick={() => changeRole("Teacher")}
                className={
                  role === "Teacher"
                    ? "rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                }
              >
                Teacher
              </button>

              <button
                type="button"
                onClick={() => changeRole("Administrator")}
                className={
                  role === "Administrator"
                    ? "rounded-lg bg-blue-700 px-3 py-2 text-sm font-medium text-white"
                    : "rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                }
              >
                Admin
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-6">
            {role === "Student" && (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="school"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    School
                  </label>

                  <select
                    id="school"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    onFocus={() => {
                      if (schools.length === 0) {
                        loadSchools();
                      }
                    }}
                    disabled={loadingSchools}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      {loadingSchools
                        ? "Loading registered schools..."
                        : "Select your school"}
                    </option>

                    {schools.map((school) => (
                      <option
                        key={school.id}
                        value={school.id}
                      >
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    First Name
                  </label>

                  <input
                    id="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={firstName}
                    onChange={(e) =>
                      setFirstName(e.target.value)
                    }
                    autoComplete="given-name"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="secondName"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Second Name
                  </label>

                  <input
                    id="secondName"
                    type="text"
                    placeholder="Enter your second name"
                    value={secondName}
                    onChange={(e) =>
                      setSecondName(e.target.value)
                    }
                    autoComplete="family-name"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admissionNumber"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Admission Number
                  </label>

                  <input
                    id="admissionNumber"
                    type="text"
                    placeholder="Enter your admission number"
                    value={admissionNumber}
                    onChange={(e) =>
                      setAdmissionNumber(e.target.value)
                    }
                    autoComplete="username"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="studentPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <input
                    id="studentPassword"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Student login requires your school, first
                  name, second name, admission number and
                  password.
                </p>
              </div>
            )}

            {role === "Parent" && (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="parentSchool"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    School
                  </label>

                  <select
                    id="parentSchool"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    onFocus={() => {
                      if (schools.length === 0) {
                        loadSchools();
                      }
                    }}
                    disabled={loadingSchools}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      {loadingSchools
                        ? "Loading registered schools..."
                        : "Select your school"}
                    </option>

                    {schools.map((school) => (
                      <option
                        key={school.id}
                        value={school.id}
                      >
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Phone Number
                  </label>

                  <input
                    id="phoneNumber"
                    type="tel"
                    placeholder="e.g. 0712345678"
                    value={phoneNumber}
                    onChange={(e) =>
                      setPhoneNumber(e.target.value)
                    }
                    autoComplete="tel"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="parentPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <input
                    id="parentPassword"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  Use the phone number and password provided
                  by your School Administrator.
                </p>
              </div>
            )}

            {(role === "Teacher" ||
              role === "Administrator") && (
              <div>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    placeholder="e.g. teacher@example.com"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />

                  {role === "Teacher" && (
                    <p className="mt-2 text-xs text-slate-500">
                      Use the email address registered by
                      your School Administrator.
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={signingIn}
              className="mt-6 w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingIn ? "Signing in…" : "Login"}
            </button>
          </form>

          {message && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {message}
            </p>
          )}

          <div className="mt-6 text-center text-sm text-slate-500">
            <p>Don't have an account?</p>

            <button
              type="button"
              className="mt-1 font-semibold text-blue-700 hover:underline"
              onClick={() =>
                alert(
                  "Registration will be added in the next stage."
                )
              }
            >
              Create an account
            </button>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-blue-700"
            >
              ← Back Home
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}