"use client";

import { useEffect, useMemo, useState } from "react";

type Subject = { id: string; name: string };

type LearningResource = {
  id: string;
  title: string;
  topic: string | null;
  gradeLevel: number;
  subjectId: string;
  resourceType: string;
  content: string;
  filePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
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

const inputClass =
  "w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-600";

export default function LearningResourcesManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [gradeLevel, setGradeLevel] = useState("1");
  const [subjectId, setSubjectId] = useState("");
  const [resourceType, setResourceType] = useState("NOTE");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [subjectsResponse, resourcesResponse] = await Promise.all([
        fetch("/api/subjects", { cache: "no-store" }),
        fetch("/api/learning-resources", { cache: "no-store" }),
      ]);

      const subjectsData = await subjectsResponse.json();
      const resourcesData = await resourcesResponse.json();

      if (!subjectsResponse.ok) {
        throw new Error(subjectsData?.error || "Failed to load subjects.");
      }
      if (!resourcesResponse.ok) {
        throw new Error(
          resourcesData?.error || "Failed to load learning resources."
        );
      }

      setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
      setResources(Array.isArray(resourcesData) ? resourcesData : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load learning resources."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!subjectId && subjects.length > 0) {
      setSubjectId(subjects[0].id);
    }
  }, [subjects, subjectId]);

  const sortedResources = useMemo(
    () =>
      [...resources].sort(
        (a, b) =>
          a.gradeLevel - b.gradeLevel ||
          a.subject.name.localeCompare(b.subject.name) ||
          a.title.localeCompare(b.title)
      ),
    [resources]
  );

  function resetForm() {
    setEditingId("");
    setTitle("");
    setTopic("");
    setGradeLevel("1");
    setResourceType("NOTE");
    setContent("");
    setPublished(true);
    setFile(null);
  }

  function startEditing(resource: LearningResource) {
    setEditingId(resource.id);
    setTitle(resource.title);
    setTopic(resource.topic ?? "");
    setGradeLevel(String(resource.gradeLevel));
    setSubjectId(resource.subjectId);
    setResourceType(resource.resourceType);
    setContent(resource.content);
    setPublished(resource.published);
    setFile(null);
    setMessage("Editing selected resource. Save your changes below.");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      let response: Response;

      if (editingId) {
        if (file) {
          throw new Error(
            "To replace a document, create a new resource with the replacement file, verify it, then delete the old resource."
          );
        }

        response = await fetch("/api/learning-resources", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingId,
            title,
            topic,
            gradeLevel: Number(gradeLevel),
            subjectId,
            resourceType,
            content,
            published,
          }),
        });
      } else {
        const form = new FormData();
        form.set("title", title);
        form.set("topic", topic);
        form.set("gradeLevel", gradeLevel);
        form.set("subjectId", subjectId);
        form.set("resourceType", resourceType);
        form.set("content", content);
        form.set("published", String(published));
        if (file) form.set("file", file);

        response = await fetch("/api/learning-resources", {
          method: "POST",
          body: form,
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Could not save resource.");
      }

      setMessage(editingId ? "Resource updated successfully." : "Resource created successfully.");
      resetForm();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save resource.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(resource: LearningResource) {
    setBusyId(resource.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/learning-resources", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: resource.id,
          published: !resource.published,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not update publication status.");

      setMessage(
        !resource.published
          ? "Resource published for teachers and learners."
          : "Resource unpublished and hidden from teachers and learners."
      );
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update resource.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteResource(resource: LearningResource) {
    const confirmed = window.confirm(
      `Delete "${resource.title}" permanently? This cannot be undone.`
    );
    if (!confirmed) return;

    setBusyId(resource.id);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/learning-resources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resource.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Could not delete resource.");

      if (editingId === resource.id) resetForm();
      setMessage("Resource deleted.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete resource.");
    } finally {
      setBusyId("");
    }
  }

  function formatType(type: string) {
    return RESOURCE_TYPES.find((item) => item.value === type)?.label ?? type;
  }

  function formatSize(size: number | null) {
    if (size == null) return "";
    return size < 1024 * 1024
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-2xl font-bold">
          {editingId ? "Edit Learning Resource" : "Add Learning Resource"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Resources are shared across schools. Published items are available to signed-in teachers and learners.
          Only Platform Administrators can manage this collection.
        </p>

        {message && (
          <div role="status" className="mt-5 rounded-lg bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {message}
          </div>
        )}
        {error && (
          <div role="alert" className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="lr-title" className="mb-2 block text-sm font-semibold">Title</label>
              <input id="lr-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required placeholder="e.g. Introduction to Numbers" />
            </div>
            <div>
              <label htmlFor="lr-topic" className="mb-2 block text-sm font-semibold">Topic (optional)</label>
              <input id="lr-topic" className={inputClass} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topic or sub-topic" />
            </div>
            <div>
              <label htmlFor="lr-grade" className="mb-2 block text-sm font-semibold">Grade</label>
              <select id="lr-grade" className={inputClass} value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}>
                {Array.from({ length: 9 }, (_, i) => i + 1).map((grade) => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="lr-subject" className="mb-2 block text-sm font-semibold">Subject</label>
              <select id="lr-subject" className={inputClass} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
                <option value="">Select subject</option>
                {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lr-type" className="mb-2 block text-sm font-semibold">Resource Type</label>
              <select id="lr-type" className={inputClass} value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
                {RESOURCE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="lr-file" className="mb-2 block text-sm font-semibold">Upload a file (optional)</label>
              <input
                id="lr-file"
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                disabled={Boolean(editingId)}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-lg border border-slate-300 px-3 py-3 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500">PDF, DOC, DOCX or TXT; maximum 20 MB. Leave empty to create a text resource.</p>
              {file && <p className="mt-1 text-xs text-slate-600">Selected: {file.name} ({formatSize(file.size)})</p>}
            </div>
          </div>

          <div>
            <label htmlFor="lr-content" className="mb-2 block text-sm font-semibold">Text Content (optional for file uploads)</label>
            <textarea id="lr-content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} className={inputClass} placeholder="Write the resource here, or upload a document above." />
          </div>

          <label className="flex items-center gap-3 text-sm font-medium">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="h-4 w-4" />
            Publish this resource immediately
          </label>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving || !subjectId} className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Save Changes" : "Create Resource"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-6 py-3 font-semibold hover:bg-slate-50">
                Cancel Editing
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h3 className="text-2xl font-bold">Resource Manager</h3>
        <p className="mt-2 text-sm text-slate-600">Published items are visible to teachers and learners. Drafts remain private to the Platform Administrator.</p>

        {loading ? (
          <p className="mt-6 text-sm text-slate-500">Loading resources...</p>
        ) : sortedResources.length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-50 p-6 text-center text-slate-600">No learning resources yet.</div>
        ) : (
          <div className="mt-6 space-y-4">
            {sortedResources.map((resource) => (
              <article key={resource.id} className="rounded-xl border border-slate-200 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-bold">{resource.title}</h4>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${resource.published ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                        {resource.published ? "Published" : "Draft"}
                      </span>
                      {resource.fileName && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">File resource</span>}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Grade {resource.gradeLevel} · {resource.subject.name} · {formatType(resource.resourceType)}
                    </p>
                    {resource.topic && <p className="mt-1 text-sm text-slate-500">Topic: {resource.topic}</p>}
                    {resource.fileName && <p className="mt-2 break-all text-sm text-slate-700">File: {resource.fileName} {resource.fileSize != null ? `(${formatSize(resource.fileSize)})` : ""}</p>}
                    {resource.content && <p className="mt-3 whitespace-pre-line break-words text-sm leading-6 text-slate-600">{resource.content.slice(0, 350)}{resource.content.length > 350 ? "..." : ""}</p>}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {resource.filePath && (
                      <a href={`/api/learning-resources/${encodeURIComponent(resource.id)}/download`} className="rounded-lg border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50">
                        Download File
                      </a>
                    )}
                    <button type="button" onClick={() => startEditing(resource)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50">
                      Edit
                    </button>
                    <button type="button" disabled={busyId === resource.id} onClick={() => void togglePublished(resource)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">
                      {busyId === resource.id ? "Working..." : resource.published ? "Unpublish" : "Publish"}
                    </button>
                    <button type="button" disabled={busyId === resource.id} onClick={() => void deleteResource(resource)} className="rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}