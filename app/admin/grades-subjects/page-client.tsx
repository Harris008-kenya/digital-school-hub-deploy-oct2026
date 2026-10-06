"use client";

import { useEffect, useMemo, useState } from "react";

type Grade = {
  id: string;
  name: string;
  level: number;
  _count?: {
    students: number;
  };
};

type Subject = {
  id: string;
  name: string;
};

type GradeSubject = {
  id: string;
  subject: Subject;
};

const CBC_LOWER_PRIMARY = [
  "Mathematics",
  "English",
  "Creative Arts",
  "Agriculture",
  "Social Studies",
  "Religion",
  "Kiswahili",
  "Science and Technology",
];

const CBC_JUNIOR_SECONDARY = [
  "Mathematics",
  "Agriculture",
  "Pretechnical Studies",
  "Social Studies",
  "Integrated Science",
  "English",
  "Kiswahili",
  "Creative Arts",
  "Religion",
];

function normalizeSubjectName(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();
}

function subjectMatches(subjectName: string, requiredName: string) {
  const actual = normalizeSubjectName(subjectName);
  const required = normalizeSubjectName(requiredName);

  if (actual === required) {
    return true;
  }

  const aliases: Record<string, string[]> = {
    "science and technology": [
      "science & technology",
      "science technology",
      "science and tech",
    ],
    "pretechnical studies": [
      "pre-technical studies",
      "pre technical studies",
      "pretechnical",
      "pre-technical",
    ],
    "integrated science": [
      "integrated science and technology",
    ],
    religion: [
      "religious education",
      "religious studies",
      "cre",
      "christian religious education",
      "ire",
      "islamic religious education",
    ],
    "creative arts": [
      "creative arts and sports",
      "creative arts & sports",
    ],
  };

  const accepted = aliases[required] ?? [];

  return accepted.some(
    (alias) => normalizeSubjectName(alias) === actual,
  );
}

export default function GradesSubjectsPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [gradeSubjects, setGradeSubjects] = useState<GradeSubject[]>([]);

  const [selectedGradeId, setSelectedGradeId] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    [],
  );

  const [loading, setLoading] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [savingGrade, setSavingGrade] = useState(false);

  const [editGradeName, setEditGradeName] = useState("");
  const [editGradeLevel, setEditGradeLevel] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedGrade = useMemo(
    () => grades.find((grade) => grade.id === selectedGradeId),
    [grades, selectedGradeId],
  );

  async function loadInitialData() {
    setLoading(true);
    setError("");

    try {
      const [gradesResponse, subjectsResponse] = await Promise.all([
        fetch("/api/grades"),
        fetch("/api/subjects"),
      ]);

      const gradesData = await gradesResponse.json();
      const subjectsData = await subjectsResponse.json();

      if (!gradesResponse.ok) {
        throw new Error(
          gradesData?.error || "Failed to load grades.",
        );
      }

      if (!subjectsResponse.ok) {
        throw new Error(
          subjectsData?.error || "Failed to load subjects.",
        );
      }

      const loadedGrades: Grade[] = Array.isArray(gradesData)
        ? gradesData
        : [];

      const loadedSubjects: Subject[] = Array.isArray(subjectsData)
        ? subjectsData
        : [];

      setGrades(loadedGrades);
      setSubjects(loadedSubjects);

      if (loadedGrades.length > 0) {
        setSelectedGradeId((current) => current || loadedGrades[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Grades & Subjects.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadGradeSubjects(gradeId: string) {
    if (!gradeId) {
      setGradeSubjects([]);
      setSelectedSubjectIds([]);
      return;
    }

    setLoadingSubjects(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/grade-subjects?gradeId=${encodeURIComponent(gradeId)}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load grade subjects.",
        );
      }

      const loadedGradeSubjects: GradeSubject[] = Array.isArray(data)
        ? data
        : [];

      setGradeSubjects(loadedGradeSubjects);
      setSelectedSubjectIds(
        loadedGradeSubjects.map((item) => item.subject.id),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load subjects for this grade.",
      );
      setGradeSubjects([]);
      setSelectedSubjectIds([]);
    } finally {
      setLoadingSubjects(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedGradeId) {
      loadGradeSubjects(selectedGradeId);
    }
  }, [selectedGradeId]);

  function openEditGrade(grade: Grade) {
    setEditingGrade(grade);
    setEditGradeName(grade.name);
    setEditGradeLevel(String(grade.level));
    setError("");
    setMessage("");
  }

  function closeEditGrade() {
    if (savingGrade) {
      return;
    }

    setEditingGrade(null);
    setEditGradeName("");
    setEditGradeLevel("");
  }

  async function saveGradeChanges() {
    if (!editingGrade) {
      return;
    }

    const name = editGradeName.trim();
    const level = Number(editGradeLevel);

    if (!name) {
      setError("Grade name is required.");
      return;
    }

    if (!Number.isInteger(level) || level < 1) {
      setError("Grade level must be a positive whole number.");
      return;
    }

    setSavingGrade(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/grades", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gradeId: editingGrade.id,
          name,
          level,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to update grade.",
        );
      }

      setGrades((current) =>
        current
          .map((grade) =>
            grade.id === data.id
              ? {
                  ...grade,
                  name: data.name,
                  level: data.level,
                  _count: data._count ?? grade._count,
                }
              : grade,
          )
          .sort(
            (a, b) =>
              a.level - b.level ||
              a.name.localeCompare(b.name),
          ),
      );

      setSelectedGradeId(data.id);

      setEditingGrade(null);
      setEditGradeName("");
      setEditGradeLevel("");

      setMessage(
        `${data.name} was updated successfully.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update grade.",
      );
    } finally {
      setSavingGrade(false);
    }
  }

  function toggleSubject(subjectId: string) {
    setSelectedSubjectIds((current) => {
      if (current.includes(subjectId)) {
        return current.filter((id) => id !== subjectId);
      }

      return [...current, subjectId];
    });

    setMessage("");
    setError("");
  }

  function applyPreset(requiredSubjects: string[]) {
    const matchingIds = subjects
      .filter((subject) =>
        requiredSubjects.some((required) =>
          subjectMatches(subject.name, required),
        ),
      )
      .map((subject) => subject.id);

    setSelectedSubjectIds(matchingIds);

    setMessage(
      matchingIds.length === requiredSubjects.length
        ? "CBC preset loaded. Review the subjects and click Save Assignments."
        : `CBC preset loaded, but only ${matchingIds.length} of ${requiredSubjects.length} expected subjects were found. Please review the subject names.`,
    );

    setError("");
  }

  function applyPresetForSelectedGrade() {
    if (!selectedGrade) {
      return;
    }

    if (selectedGrade.level >= 7) {
      applyPreset(CBC_JUNIOR_SECONDARY);
      return;
    }

    applyPreset(CBC_LOWER_PRIMARY);
  }

  async function saveAssignments() {
    if (!selectedGradeId) {
      setError("Please select a grade first.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const currentIds = new Set(
        gradeSubjects.map((item) => item.subject.id),
      );

      const selectedIds = new Set(selectedSubjectIds);

      const subjectsToAdd = subjects.filter(
        (subject) =>
          selectedIds.has(subject.id) &&
          !currentIds.has(subject.id),
      );

      const subjectsToRemove = gradeSubjects.filter(
        (item) => !selectedIds.has(item.subject.id),
      );

      if (subjectsToRemove.length > 0) {
        setError(
          "Removing existing subject assignments is not enabled yet. This protects existing teacher assignments and results. You can add subjects safely now.",
        );
        setSaving(false);
        return;
      }

      for (const subject of subjectsToAdd) {
        const response = await fetch("/api/grade-subjects", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            gradeId: selectedGradeId,
            subjectId: subject.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              `Failed to assign ${subject.name}.`,
          );
        }
      }

      await loadGradeSubjects(selectedGradeId);

      setMessage(
        subjectsToAdd.length > 0
          ? `${subjectsToAdd.length} subject assignment${
              subjectsToAdd.length === 1 ? "" : "s"
            } saved successfully.`
          : "The grade's subject assignments are already up to date.",
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save subject assignments.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <p className="text-slate-600">
              Loading Grades & Subjects...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Grades & Subjects
          </h1>

          <p className="mt-2 text-slate-600">
            Manage your school grades and configure the subjects
            taught in each grade.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Grades
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select a grade below to configure its CBC subjects.
              You can also edit the grade name or level.
            </p>
          </div>

          {grades.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-medium text-slate-700">
                No grades have been created yet.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Create Grade 1–9 before configuring subjects.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {grades.map((grade) => {
                const isSelected = grade.id === selectedGradeId;

                return (
                  <div
                    key={grade.id}
                    className={`rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedGradeId(grade.id);
                        setMessage("");
                        setError("");
                      }}
                      className="w-full text-left"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">
                          {grade.name}
                        </span>

                        {isSelected && (
                          <span className="rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                            Selected
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex gap-4 text-sm text-slate-500">
                        <span>
                          Level {grade.level}
                        </span>

                        <span>
                          {grade._count?.students ?? 0} students
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditGrade(grade)}
                      className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Edit Grade
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Subject Configuration
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {selectedGrade
                  ? `Configure subjects for ${selectedGrade.name}.`
                  : "Select a grade to configure subjects."}
              </p>
            </div>

            {selectedGrade && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={applyPresetForSelectedGrade}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  Apply CBC Preset
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPreset(CBC_LOWER_PRIMARY)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Grade 1–6 Preset
                </button>

                <button
                  type="button"
                  onClick={() =>
                    applyPreset(CBC_JUNIOR_SECONDARY)
                  }
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Grade 7–9 Preset
                </button>
              </div>
            )}
          </div>

          {!selectedGrade ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="text-slate-600">
                Select a grade above to begin.
              </p>
            </div>
          ) : loadingSubjects ? (
            <div className="mt-6 rounded-xl bg-slate-50 p-8 text-center">
              <p className="text-slate-600">
                Loading subjects for {selectedGrade.name}...
              </p>
            </div>
          ) : subjects.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
              <p className="font-medium text-slate-700">
                No subjects were found.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                The school's subject list needs to be created
                first.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => {
                  const checked = selectedSubjectIds.includes(
                    subject.id,
                  );

                  return (
                    <label
                      key={subject.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        checked
                          ? "border-green-300 bg-green-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleSubject(subject.id)
                        }
                        className="mt-1 h-5 w-5 rounded border-slate-300"
                      />

                      <div>
                        <p className="font-semibold text-slate-900">
                          {subject.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {checked
                            ? "Selected for this grade"
                            : "Not selected"}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">
                    {selectedSubjectIds.length}
                  </span>{" "}
                  subject
                  {selectedSubjectIds.length === 1
                    ? ""
                    : "s"}{" "}
                  selected for {selectedGrade.name}.
                </div>

                <button
                  type="button"
                  onClick={saveAssignments}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : "Save Subject Assignments"}
                </button>
              </div>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="font-bold text-blue-900">
            CBC Subject Structure
          </h3>

          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-white p-4">
              <p className="font-semibold text-slate-900">
                Grade 1–6
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Mathematics, English, Creative Arts,
                Agriculture, Social Studies, Religion,
                Kiswahili, Science and Technology.
              </p>

              <p className="mt-2 text-sm font-semibold text-blue-700">
                8 subjects
              </p>
            </div>

            <div className="rounded-xl bg-white p-4">
              <p className="font-semibold text-slate-900">
                Grade 7–9
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Mathematics, Agriculture, Pretechnical Studies,
                Social Studies, Integrated Science, English,
                Kiswahili, Creative Arts, Religion.
              </p>

              <p className="mt-2 text-sm font-semibold text-blue-700">
                9 subjects
              </p>
            </div>
          </div>
        </section>
      </div>

      {editingGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Edit Grade
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Correct the grade name or level.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditGrade}
                disabled={savingGrade}
                className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="edit-grade-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Grade Name
                </label>

                <input
                  id="edit-grade-name"
                  type="text"
                  value={editGradeName}
                  onChange={(event) =>
                    setEditGradeName(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. Grade 4"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-grade-level"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Level
                </label>

                <input
                  id="edit-grade-level"
                  type="number"
                  min="1"
                  step="1"
                  value={editGradeLevel}
                  onChange={(event) =>
                    setEditGradeLevel(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="e.g. 4"
                />

                <p className="mt-2 text-xs text-slate-500">
                  The level determines the grade's position in the
                  school and is also used when applying the CBC
                  Grade 1–6 or Grade 7–9 preset.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEditGrade}
                disabled={savingGrade}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveGradeChanges}
                disabled={savingGrade}
                className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingGrade ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}