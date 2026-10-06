"use client";

import { useEffect, useMemo, useState } from "react";

type Subject = {
  id: string;
  name: string;
};

type LearningResource = {
  id: string;
  title: string;
  topic: string | null;
  gradeLevel: number;
  resourceType: string;
  content: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  subject: Subject;
};

const RESOURCE_TYPES = [
  { value: "NOTE", label: "Note" },
  { value: "REVISION", label: "Revision Material" },
  { value: "EXERCISE", label: "Exercise" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "STUDY_GUIDE", label: "Study Guide" },
];

export default function LearningResourcesManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("1");
  const [subjectId, setSubjectId] = useState("");
  const [resourceType, setResourceType] = useState("NOTE");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(true);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [subjectsResponse, resourcesResponse] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/learning-resources"),
      ]);

      const subjectsData = await subjectsResponse.json();
      const resourcesData = await resourcesResponse.json();

      if (!subjectsResponse.ok) {
        throw new Error(
          subjectsData?.error || "Failed to load subjects"
        );
      }

      if (!resourcesResponse.ok) {
        throw new Error(
          resourcesData?.error || "Failed to load learning resources"
        );
      }

      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setResources(Array.isArray(resourcesData) ? resourcesData : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load learning resources"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

  const sortedResources = useMemo(() => {
    return [...resources].sort((a, b) => {
      if (a.gradeLevel !== b.gradeLevel) {
        return a.gradeLevel - b.gradeLevel;
      }

      const subjectComparison = a.subject.name.localeCompare(
        b.subject.name
      );

      if (subjectComparison !== 0) {
        return subjectComparison;
      }

      return a.title.localeCompare(b.title);
    });
  }, [resources]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/learning-resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          topic,
          gradeLevel: Number(gradeLevel),
          subjectId,
          resourceType,
          content,
          published,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to create learning resource"
        );
      }

      setTitle("");
      setTopic("");
      setGradeLevel("1");
      setResourceType("NOTE");
      setContent("");
      setPublished(true);

      setMessage("Learning resource created successfully.");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create learning resource"
      );
    } finally {
      setSaving(false);
    }
  }

  function formatResourceType(type: string) {
    const match = RESOURCE_TYPES.find(
      (resourceType) => resourceType.value === type
    );

    return match?.label || type;
  }

  function openPrintableResource(resource: LearningResource) {
    const printableWindow = window.open("", "_blank");

    if (!printableWindow) {
      setError(
        "The printable window was blocked by your browser. Please allow pop-ups and try again."
      );
      return;
    }

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    const formattedContent = escapeHtml(resource.content)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n/g, "<br />");

    printableWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${escapeHtml(resource.title)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 40px;
              color: #111827;
              line-height: 1.7;
            }

            h1 {
              margin-bottom: 8px;
            }

            .meta {
              color: #475569;
              margin-bottom: 28px;
            }

            .content {
              white-space: normal;
            }

            @media print {
              body {
                margin: 20mm;
              }
            }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(resource.title)}</h1>

          <div class="meta">
            <strong>Grade:</strong> ${resource.gradeLevel}
            &nbsp; | &nbsp;
            <strong>Subject:</strong> ${escapeHtml(resource.subject.name)}
            &nbsp; | &nbsp;
            <strong>Type:</strong> ${escapeHtml(
              formatResourceType(resource.resourceType)
            )}
            ${
              resource.topic
                ? `&nbsp; | &nbsp;<strong>Topic:</strong> ${escapeHtml(
                    resource.topic
                  )}`
                : ""
            }
          </div>

          <div class="content">
            ${formattedContent}
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printableWindow.document.close();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6">
          <h3 className="text-2xl font-bold">
            Add Learning Resource
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Create platform-wide learning resources that can be
            accessed by teachers and students across all schools.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Title
              </label>

              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Introduction to Numbers"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Topic
              </label>

              <input
                type="text"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. Numbers 1–100"
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Grade
              </label>

              <select
                value={gradeLevel}
                onChange={(event) => setGradeLevel(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              >
                {Array.from({ length: 9 }, (_, index) => {
                  const grade = index + 1;

                  return (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Subject
              </label>

              <select
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              >
                <option value="">Select subject</option>

                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Resource Type
              </label>

              <select
                value={resourceType}
                onChange={(event) => setResourceType(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
              >
                {RESOURCE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Content
            </label>

            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write the learning resource here..."
              required
              rows={14}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600"
            />
          </div>

          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              checked={published}
              onChange={(event) => setPublished(event.target.checked)}
              className="h-4 w-4"
            />

            Publish this resource immediately
          </label>

          <button
            type="submit"
            disabled={saving || !subjectId}
            className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : "Create Resource"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6">
          <h3 className="text-2xl font-bold">
            Published Learning Resources
          </h3>

          <p className="mt-2 text-sm text-slate-600">
            These are the resources currently available to
            teachers and students.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">
            Loading resources...
          </p>
        ) : sortedResources.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-6 text-center">
            <p className="font-medium text-slate-700">
              No published learning resources yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedResources.map((resource) => (
              <article
                key={resource.id}
                className="rounded-xl border border-slate-200 p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold">
                        {resource.title}
                      </h4>

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Published
                      </span>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">
                      Grade {resource.gradeLevel} ·{" "}
                      {resource.subject.name} ·{" "}
                      {formatResourceType(resource.resourceType)}
                    </p>

                    {resource.topic && (
                      <p className="mt-1 text-sm text-slate-500">
                        Topic: {resource.topic}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      openPrintableResource(resource)
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-100"
                  >
                    Open & Print
                  </button>
                </div>

                <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-7 text-slate-700">
                  {resource.content.length > 300
                    ? `${resource.content.slice(0, 300)}...`
                    : resource.content}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}