import Link from "next/link";

const features = [
  {
    icon: "📚",
    title: "Learning",
    description:
      "Access notes, revision materials, assignments and learning resources.",
  },
  {
    icon: "📝",
    title: "Quizzes",
    description:
      "Create and complete quizzes to practise and measure understanding.",
  },
  {
    icon: "📊",
    title: "Results",
    description:
      "Keep track of examination marks and student performance.",
  },
  {
    icon: "🏫",
    title: "School Management",
    description:
      "Manage students, teachers, classes and subjects.",
  },
];

const roles = [
  {
    title: "Students",
    description:
      "Learn, practise, complete quizzes and view academic results.",
  },
  {
    title: "Teachers",
    description:
      "Manage classes, create learning activities and enter marks.",
  },
  {
    title: "Administrators",
    description:
      "Manage the school, users, subjects, classes and examinations.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              Learn • Manage • Connect
            </p>
          </div>

          <Link
            href="/login"
            className="rounded-lg bg-blue-700 px-5 py-2.5 font-medium text-white hover:bg-blue-800"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center text-white">
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-200">
            Smart School Management
          </p>

          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Welcome to Digital School Hub
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-100">
            A simple digital platform for schools, teachers, students and
            parents to learn, manage school activities and stay connected.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="rounded-lg bg-white px-7 py-3 font-semibold text-blue-700 hover:bg-blue-50"
            >
              Student Login
            </Link>

            <Link
              href="/login"
              className="rounded-lg border border-blue-200 px-7 py-3 font-semibold text-white hover:bg-blue-600"
            >
              Teacher Login
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-3xl font-bold">
            Everything in one place
          </h2>

          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Digital School Hub brings important school activities together
            in one easy-to-use platform.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="text-3xl">{feature.icon}</div>

              <h3 className="mt-4 text-xl font-semibold">
                {feature.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* User roles */}
      <section className="border-y bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="text-center">
            <h2 className="text-3xl font-bold">
              Built for every school user
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Different dashboards will provide the tools each user needs.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center"
              >
                <h3 className="text-xl font-bold text-blue-700">
                  {role.title}
                </h3>

                <p className="mt-3 leading-7 text-slate-600">
                  {role.description}
                </p>

                <Link
                  href="/login"
                  className="mt-6 inline-block rounded-lg border border-blue-700 px-5 py-2.5 font-medium text-blue-700 hover:bg-blue-700 hover:text-white"
                >
                  Learn More
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action */}
      <section className="bg-slate-900">
        <div className="mx-auto max-w-4xl px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-bold">
            Build a smarter digital school
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Digital School Hub is being built to make learning and school
            management simpler, faster and more accessible.
          </p>

          <Link
            href="/login"
            className="mt-8 inline-block rounded-lg bg-blue-600 px-7 py-3 font-semibold text-white hover:bg-blue-500"
          >
            Get Started
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-8 text-center text-sm text-slate-500">
          © 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}