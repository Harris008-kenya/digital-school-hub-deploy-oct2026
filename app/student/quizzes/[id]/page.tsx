"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type QuizOption = {
  id: string;
  text: string;
  position: number;
};

type QuizQuestion = {
  id: string;
  question: string;
  type: "MULTIPLE_CHOICE";
  position: number;
  options: QuizOption[];
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  subject: {
    id: string;
    name: string;
  };
  grade: {
    id: string;
    name: string;
  };
  questions: QuizQuestion[];
};

type QuizResult = {
  totalQuestions: number;
  answeredQuestions: number;
  correctAnswers: number;
  percentage: number;
};

export default function StudentQuizPage() {
  const params = useParams();
  const router = useRouter();

  const quizId =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : "";

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!quizId) {
      setError("Quiz ID is missing.");
      setLoading(false);
      return;
    }

    async function loadQuiz() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/student/quizzes/${quizId}`,
          {
            credentials: "include",
          }
        );

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        const data = await response.json();

        if (!response.ok) {
          setError(
            data.error || "Failed to load quiz."
          );
          return;
        }

        setQuiz(data.quiz);
      } catch (err) {
        console.error("Error loading quiz:", err);
        setError("Unable to load the quiz.");
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [quizId, router]);

  function handleAnswer(
    questionId: string,
    optionId: string
  ) {
    if (result) {
      return;
    }

    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));
  }

  async function handleSubmit() {
    if (!quiz || submitting || result) {
      return;
    }

    if (quiz.questions.length === 0) {
      setError("This quiz has no questions.");
      return;
    }

    const unansweredQuestions = quiz.questions.filter(
      (question) => !answers[question.id]
    );

    if (unansweredQuestions.length > 0) {
      setError(
        `Please answer all questions before submitting. ${unansweredQuestions.length} question${
          unansweredQuestions.length === 1 ? "" : "s"
        } remaining.`
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const submittedAnswers = quiz.questions.map(
        (question) => ({
          questionId: question.id,
          optionId: answers[question.id],
        })
      );

      const response = await fetch(
        `/api/student/quizzes/${quiz.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            answers: submittedAnswers,
          }),
        }
      );

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error || "Failed to submit quiz."
        );
        return;
      }

      setResult(data.result);
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError("Unable to submit the quiz.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-gray-600">
              Loading quiz...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !quiz) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <Link
              href="/student"
              className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              ← Back to Student Dashboard
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900">
              Unable to Load Quiz
            </h1>

            <p className="mt-3 text-red-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/student/quizzes"
                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800"
              >
                Back to My Quizzes
              </Link>

              <Link
                href="/student"
                className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-100"
              >
                Student Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!quiz) {
    return null;
  }

  if (result) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6">
            <Link
              href="/student"
              className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              ← Back to Student Dashboard
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
              <span className="text-3xl font-bold text-blue-700">
                ✓
              </span>
            </div>

            <h1 className="mt-5 text-3xl font-bold text-gray-900">
              Quiz Completed
            </h1>

            <p className="mt-2 text-gray-600">
              {quiz.title}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Score
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {result.correctAnswers}/
                  {result.totalQuestions}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Answered
                </p>

                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {result.answeredQuestions}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-5">
                <p className="text-sm text-gray-500">
                  Percentage
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-700">
                  {result.percentage}%
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/student"
                className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
              >
                ← Student Dashboard
              </Link>

              <Link
                href="/student/quizzes"
                className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-100"
              >
                Back to My Quizzes
              </Link>

              <Link
                href="/student/quiz-history"
                className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-100"
              >
                View Quiz History
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/student"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            ← Back to Student Dashboard
          </Link>

          <Link
            href="/student/quizzes"
            className="text-sm font-semibold text-blue-700 hover:text-blue-900"
          >
            Back to My Quizzes →
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-8">
          <div className="border-b border-gray-200 pb-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {quiz.title}
            </h1>

            {quiz.description && (
              <p className="mt-3 text-gray-600">
                {quiz.description}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                {quiz.subject.name}
              </span>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {quiz.grade.name}
              </span>

              <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                {quiz.questions.length}{" "}
                {quiz.questions.length === 1
                  ? "Question"
                  : "Questions"}
              </span>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-8">
            {quiz.questions.map(
              (question, questionIndex) => (
                <section
                  key={question.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <h2 className="text-lg font-semibold text-gray-900">
                    {questionIndex + 1}.{" "}
                    {question.question}
                  </h2>

                  <div className="mt-4 space-y-3">
                    {question.options.map((option) => {
                      const selected =
                        answers[question.id] ===
                        option.id;

                      return (
                        <label
                          key={option.id}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                            selected
                              ? "border-blue-600 bg-blue-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            value={option.id}
                            checked={selected}
                            onChange={() =>
                              handleAnswer(
                                question.id,
                                option.id
                              )
                            }
                            className="h-4 w-4"
                          />

                          <span className="text-gray-800">
                            {option.text}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              )
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Submitting Quiz..."
                : "Submit Quiz"}
            </button>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center">
            <Link
              href="/student"
              className="text-sm font-semibold text-blue-700 hover:text-blue-900"
            >
              ← Return to Student Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}