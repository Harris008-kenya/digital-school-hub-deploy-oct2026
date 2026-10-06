
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type QuizOption = {
  id: string;
  text: string;
  isCorrect: boolean;
  position: number;
};

type QuizQuestion = {
  id: string;
  question: string;
  position: number;
  options: QuizOption[];
};

type Quiz = {
  id: string;
  title: string;
  description: string | null;
  published: boolean;
  grade: {
    name: string;
  };
  subject: {
    name: string;
  };
  questions: QuizQuestion[];
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function TeacherQuizDetailPage({
  params,
}: PageProps) {
  const [quizId, setQuizId] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingQuestionId, setEditingQuestionId] =
    useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState([
    "",
    "",
    "",
    "",
  ]);
  const [correctAnswer, setCorrectAnswer] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadQuizId() {
      const resolvedParams = await params;
      setQuizId(resolvedParams.id);
    }

    loadQuizId();
  }, [params]);

  useEffect(() => {
    if (!quizId) {
      return;
    }

    async function loadQuiz() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/teacher/quizzes/${quizId}/questions`
        );

        if (!response.ok) {
          throw new Error("Failed to load quiz");
        }

        const questionData = await response.json();

        const quizResponse = await fetch(
          `/api/teacher/quizzes`
        );

        if (!quizResponse.ok) {
          throw new Error(
            "Failed to load quiz information"
          );
        }

        const quizListData = await quizResponse.json();

        const foundQuiz = quizListData.quizzes.find(
          (item: Quiz) => item.id === quizId
        );

        if (!foundQuiz) {
          throw new Error("Quiz not found");
        }

        setQuiz({
          ...foundQuiz,
          questions: questionData.questions,
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load quiz.");
      } finally {
        setLoading(false);
      }
    }

    loadQuiz();
  }, [quizId]);

  function updateOption(
    index: number,
    value: string
  ) {
    setOptions((current) =>
      current.map((option, optionIndex) =>
        optionIndex === index
          ? value
          : option
      )
    );
  }

  function resetForm() {
    setQuestion("");
    setOptions(["", "", "", ""]);
    setCorrectAnswer(0);
    setEditingQuestionId(null);
  }

  function startEditing(
    questionItem: QuizQuestion
  ) {
    const sortedOptions = [
      ...questionItem.options,
    ].sort(
      (a, b) => a.position - b.position
    );

    setQuestion(questionItem.question);

    setOptions(
      sortedOptions.map(
        (option) => option.text
      )
    );

    const correctIndex =
      sortedOptions.findIndex(
        (option) => option.isCorrect
      );

    setCorrectAnswer(
      correctIndex >= 0 ? correctIndex : 0
    );

    setEditingQuestionId(
      questionItem.id
    );

    setShowForm(true);
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function cancelEditing() {
    resetForm();
    setShowForm(false);
    setError("");
  }

  async function saveQuestion() {
    setError("");
    setSuccess("");

    const trimmedQuestion =
      question.trim();

    if (!trimmedQuestion) {
      setError(
        "Please enter the question."
      );
      return;
    }

    const trimmedOptions =
      options.map((option) =>
        option.trim()
      );

    if (
      trimmedOptions.some(
        (option) => !option
      )
    ) {
      setError(
        "Please enter all four answer options."
      );
      return;
    }

    const normalizedOptions =
      trimmedOptions.map((option) =>
        option.toLowerCase()
      );

    const uniqueOptions =
      new Set(normalizedOptions);

    if (uniqueOptions.size !== 4) {
      setError(
        "All four answer options must be different."
      );
      return;
    }

    try {
      setSaving(true);

      const method =
        editingQuestionId
          ? "PATCH"
          : "POST";

      const response = await fetch(
        `/api/teacher/quizzes/${quizId}/questions`,
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...(editingQuestionId
              ? {
                  questionId:
                    editingQuestionId,
                }
              : {}),
            question: trimmedQuestion,
            options:
              trimmedOptions.map(
                (text, index) => ({
                  text,
                  isCorrect:
                    index ===
                    correctAnswer,
                })
              ),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to save the question."
        );
        return;
      }

      setQuiz((current) => {
        if (!current) {
          return current;
        }

        if (editingQuestionId) {
          return {
            ...current,
            questions:
              current.questions.map(
                (item) =>
                  item.id ===
                  editingQuestionId
                    ? data.question
                    : item
              ),
          };
        }

        return {
          ...current,
          questions: [
            ...current.questions,
            data.question,
          ],
        };
      });

      if (editingQuestionId) {
        setSuccess(
          "Question updated successfully."
        );
      } else {
        setSuccess(
          "Question saved successfully."
        );
      }

      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setError(
        "Something went wrong while saving the question."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuestion(
    questionId: string
  ) {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete this question? This action cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      setDeleting(true);

      const response = await fetch(
        `/api/teacher/quizzes/${quizId}/questions`,
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            questionId,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Failed to delete the question."
        );
        return;
      }

      setQuiz((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          questions:
            current.questions.filter(
              (item) =>
                item.id !== questionId
            ),
        };
      });

      if (
        editingQuestionId ===
        questionId
      ) {
        resetForm();
        setShowForm(false);
      }

      setSuccess(
        "Question deleted successfully."
      );
    } catch (err) {
      console.error(err);
      setError(
        "Something went wrong while deleting the question."
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <p className="text-slate-600">
              Loading quiz...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!quiz) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-900">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-red-700">
              Quiz not found
            </h1>

            {error && (
              <p className="mt-3 text-sm text-slate-600">
                {error}
              </p>
            )}

            <Link
              href="/teacher/my-quizzes"
              className="mt-6 inline-block rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Back to My Quizzes
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Digital School Hub
            </h1>

            <p className="text-sm text-slate-500">
              Teacher Portal
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/teacher/my-quizzes"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              My Quizzes
            </Link>

            <Link
              href="/teacher"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-blue-700">
        <div className="mx-auto max-w-7xl px-6 py-12 text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-200">
            Teacher Portal
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            {quiz.title}
          </h2>

          {quiz.description && (
            <p className="mt-3 max-w-3xl text-blue-100">
              {quiz.description}
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href={`/teacher/my-quizzes/${quiz.id}/attempts`}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            📊 View Student Attempts
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Grade
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {quiz.grade.name}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Subject
            </p>

            <p className="mt-2 text-xl font-bold text-slate-900">
              {quiz.subject.name}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm font-medium text-slate-500">
              Status
            </p>

            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                quiz.published
                  ? "bg-green-100 text-green-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {quiz.published
                ? "Published"
                : "Draft"}
            </span>
          </div>
        </div>

        {success && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
            {success}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                Quiz Questions
              </h3>

              <p className="mt-2 text-sm text-slate-600">
                This quiz currently has{" "}
                <span className="font-semibold">
                  {quiz.questions.length}
                </span>{" "}
                question
                {quiz.questions.length ===
                1
                  ? ""
                  : "s"}.
              </p>
            </div>

            {!quiz.published && (
              <button
                type="button"
                onClick={() => {
                  if (showForm) {
                    cancelEditing();
                  } else {
                    resetForm();
                    setShowForm(true);
                    setError("");
                    setSuccess("");
                  }
                }}
                className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                {showForm
                  ? "Cancel"
                  : "+ Add Question"}
              </button>
            )}
          </div>

          {quiz.published && (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
              <p className="font-semibold text-green-800">
                This quiz is published.
              </p>

              <p className="mt-1 text-sm text-green-700">
                Published quizzes cannot be changed.
              </p>
            </div>
          )}

          {showForm &&
            !quiz.published && (
              <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-6">
                <h4 className="text-xl font-bold text-slate-900">
                  {editingQuestionId
                    ? "Edit Question"
                    : "Add Multiple-Choice Question"}
                </h4>

                <p className="mt-2 text-sm text-slate-600">
                  Enter the question, provide
                  four answers, and select the
                  correct answer.
                </p>

                <div className="mt-6">
                  <label className="block text-sm font-semibold text-slate-700">
                    Question
                  </label>

                  <textarea
                    value={question}
                    onChange={(event) =>
                      setQuestion(
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Enter the question..."
                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="mt-6 space-y-5">
                  {options.map(
                    (option, index) => (
                      <div key={index}>
                        <label className="block text-sm font-semibold text-slate-700">
                          Option{" "}
                          {String.fromCharCode(
                            65 + index
                          )}
                        </label>

                        <div className="mt-2 flex gap-3">
                          <input
                            type="radio"
                            name="correct-answer"
                            checked={
                              correctAnswer ===
                              index
                            }
                            onChange={() =>
                              setCorrectAnswer(
                                index
                              )
                            }
                            className="mt-3 h-4 w-4"
                          />

                          <input
                            type="text"
                            value={option}
                            onChange={(
                              event
                            ) =>
                              updateOption(
                                index,
                                event.target
                                  .value
                              )
                            }
                            placeholder={`Enter option ${String.fromCharCode(
                              65 + index
                            )}`}
                            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>

                        {correctAnswer ===
                          index && (
                          <p className="ml-7 mt-1 text-xs font-semibold text-green-700">
                            Correct answer
                          </p>
                        )}
                      </div>
                    )
                  )}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={saveQuestion}
                    disabled={
                      saving ||
                      deleting
                    }
                    className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingQuestionId
                      ? "Update Question"
                      : "Save Question"}
                  </button>

                  <button
                    type="button"
                    onClick={
                      cancelEditing
                    }
                    disabled={saving}
                    className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

          {quiz.questions.length ===
          0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <div className="text-5xl">
                Question
              </div>

              <h4 className="mt-5 text-xl font-bold">
                No questions yet
              </h4>

              <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">
                Add multiple-choice questions
                to build this quiz. Each question
                can have four answer options and
                one correct answer.
              </p>

              {!quiz.published && (
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                    setError("");
                    setSuccess("");
                  }}
                  className="mt-6 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Add First Question
                </button>
              )}
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              {quiz.questions.map(
                (
                  questionItem,
                  index
                ) => (
                  <article
                    key={
                      questionItem.id
                    }
                    className="rounded-xl border border-slate-200 p-6"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-blue-700">
                          Question{" "}
                          {index + 1}
                        </p>

                        <h4 className="mt-2 text-lg font-bold">
                          {
                            questionItem.question
                          }
                        </h4>
                      </div>

                      {!quiz.published && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              startEditing(
                                questionItem
                              )
                            }
                            disabled={
                              saving ||
                              deleting
                            }
                            className="rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteQuestion(
                                questionItem.id
                              )
                            }
                            disabled={
                              saving ||
                              deleting
                            }
                            className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deleting
                              ? "Deleting..."
                              : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 space-y-2">
                      {[
                        ...questionItem.options,
                      ]
                        .sort(
                          (a, b) =>
                            a.position -
                            b.position
                        )
                        .map(
                          (option) => (
                            <div
                              key={
                                option.id
                              }
                              className={`rounded-lg border p-3 ${
                                option.isCorrect
                                  ? "border-green-300 bg-green-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <span className="font-medium">
                                {
                                  option.text
                                }
                              </span>

                              {option.isCorrect && (
                                <span className="ml-3 text-xs font-bold text-green-700">
                                  Correct Answer
                                </span>
                              )}
                            </div>
                          )
                        )}
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6 text-center text-sm text-slate-500">
          © 2026 Digital School Hub. All rights reserved.
        </div>
      </footer>
    </main>
  );
}