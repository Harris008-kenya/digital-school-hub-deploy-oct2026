import Link from "next/link";
import { requirePlatformAdministrator } from "@/lib/platform-administrator";
import LearningResourcesManager from "./LearningResourcesManager";

export default async function LearningResourcesPage() {
  await requirePlatformAdministrator();

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              Platform Administrator
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Admin Dashboard
            </Link>

            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Home
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-10 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Platform Learning Library
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Learning Resources
          </h2>

          <p className="mt-3 max-w-3xl text-blue-100">
            Create and manage platform-wide notes, revision materials,
            exercises, assignments and study guides for learners and
            teachers across all schools using Digital School Hub.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <LearningResourcesManager />
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          © 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}