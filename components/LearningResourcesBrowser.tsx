"use client";

import { useEffect, useMemo, useState } from "react";

type Subject = { id: string; name: string };

type LearningResource = {
  id: string;
  title: string;
  topic: string | null;
  gradeLevel: number;
  subjectId: string;
  resourceType: "NOTE" | "REVISION" | "EXERCISE" | "ASSIGNMENT" | "STUDY_GUIDE";
  content: string;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  subject: Subject;
};

const RESOURCE_TYPE_LABELS: Record<LearningResource["resourceType"], string> = {
  NOTE: "Notes",
  REVISION: "Revision Materials",
  EXERCISE: "Exercises",
  ASSIGNMENT: "Assignments",
  STUDY_GUIDE: "Study Guides",
};

export default function LearningResourcesBrowser() {
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [gradeLevel, setGradeLevel] = useState("ALL");
  const [subjectId, setSubjectId] = useState("ALL");
  const [resourceType, setResourceType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/learning-resources", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load learning resources.");
        setResources(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading learning resources:", err);
        setError(err instanceof Error ? err.message : "Unable to load learning resources.");
      } finally {
        setLoading(false);
      }
    }
    void loadResources();
  }, []);

  const subjects = useMemo(() => {
    const map = new Map<string, Subject>();
    for (const resource of resources) map.set(resource.subject.id, resource.subject);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [resources]);

  const filteredResources = useMemo(() => {
    const term = search.trim().toLowerCase();
    return resources.filter((resource) => {
      const matchesGrade = gradeLevel === "ALL" || resource.gradeLevel === Number(gradeLevel);
      const matchesSubject = subjectId === "ALL" || resource.subjectId === subjectId;
      const matchesType = resourceType === "ALL" || resource.resourceType === resourceType;
      const text = [
        resource.title,
        resource.topic ?? "",
        resource.subject.name,
        resource.content,
        resource.fileName ?? "",
        RESOURCE_TYPE_LABELS[resource.resourceType],
      ].join(" ").toLowerCase();
      return matchesGrade && matchesSubject && matchesType && (!term || text.includes(term));
    });
  }, [resources, gradeLevel, subjectId, resourceType, search]);

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function openPrintableResource(resource: LearningResource) {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to open and print this resource.");
      return;
    }

    const safeTitle = escapeHtml(resource.title);
    const safeTopic = escapeHtml(resource.topic ?? "");
    const safeSubject = escapeHtml(resource.subject.name);
    const safeContent = escapeHtml(resource.content)
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n/g, "<br />");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${safeTitle}</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 40px; color: #111827; line-height: 1.7; }
            .header { border-bottom: 2px solid #1d4ed8; padding-bottom: 18px; margin-bottom: 28px; }
            h1 { margin: 0 0 8px; font-size: 28px; }
            .meta { color: #475569; font-size: 14px; }
            .content { font-size: 16px; white-space: normal; }
            .print-button { margin-top: 30px; padding: 10px 18px; border: 0; border-radius: 8px; background: #1d4ed8; color: white; font-size: 14px; font-weight: bold; cursor: pointer; }
            @media print { body { padding: 20px; } .print-button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${safeTitle}</h1>
            <div class="meta">
              Grade ${resource.gradeLevel} &bull; ${safeSubject} &bull; ${RESOURCE_TYPE_LABELS[resource.resourceType]}
              ${safeTopic ? ` &bull; Topic: ${safeTopic}` : ""}
            </div>
          </div>
          <div class="content">${safeContent}</div>
          <button class="print-button" onclick="window.print()">Print / Save as PDF</button>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function formatSize(size: number | null) {
    if (size == null) return "";
    return size < 1024 * 1024
      ? `${Math.max(1, Math.round(size / 1024))} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h3 className="text-xl font-bold text-slate-900">Find Learning Resources</h3>
        <p className="mt-1 text-sm text-slate-600">
          Browse published resources across Grades 1–9 and available subjects.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="learning-grade" className="block text-sm font-semibold text-slate-700">Grade</label>
            <select id="learning-grade" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm">
              <option value="ALL">All Grades</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="learning-subject" className="block text-sm font-semibold text-slate-700">Subject</label>
            <select id="learning-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm">
              <option value="ALL">All Subjects</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="learning-type" className="block text-sm font-semibold text-slate-700">Resource Type</label>
            <select id="learning-type" value={resourceType} onChange={(e) => setResourceType(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm">
              <option value="ALL">All Types</option>
              <option value="NOTE">Notes</option>
              <option value="REVISION">Revision Materials</option>
              <option value="EXERCISE">Exercises</option>
              <option value="ASSIGNMENT">Assignments</option>
              <option value="STUDY_GUIDE">Study Guides</option>
            </select>
          </div>
          <div>
            <label htmlFor="learning-search" className="block text-sm font-semibold text-slate-700">Search</label>
            <input id="learning-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search titles, topics or files..." className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm" />
          </div>
        </div>
      </section>

      <section className="mt-8">
        {loading ? (
          <div className="rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">Loading learning resources...</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">{error}</div>
        ) : filteredResources.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-10 text-center shadow-sm">
            <h3 className="font-bold text-slate-900">No resources found</h3>
            <p className="mt-2 text-sm text-slate-500">Try changing the grade, subject, type or search term.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredResources.map((resource) => (
              <article key={resource.id} className="rounded-2xl border bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-800">Grade {resource.gradeLevel}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{resource.subject.name}</span>
                  <span className="rounded-full bg-green-100 px-3 py-1 text-green-800">{RESOURCE_TYPE_LABELS[resource.resourceType]}</span>
                  {resource.fileName && <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-800">Document</span>}
                </div>

                <h3 className="mt-4 break-words text-xl font-bold text-slate-900">{resource.title}</h3>
                {resource.topic && <p className="mt-1 text-sm font-medium text-slate-500">Topic: {resource.topic}</p>}

                {resource.content ? (
                  <p className="mt-4 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-600">{resource.content}</p>
                ) : resource.fileName ? (
                  <p className="mt-4 text-sm text-slate-600">Open or download the attached document to view the learning material.</p>
                ) : null}

                {resource.fileName && (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3">
                    <p className="break-all text-sm font-semibold text-slate-700">{resource.fileName}</p>
                    {resource.fileSize != null && <p className="mt-1 text-xs text-slate-500">{formatSize(resource.fileSize)}</p>}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {resource.filePath && (
                    <a href={`/api/learning-resources/${encodeURIComponent(resource.id)}/download`} className="inline-flex rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
                      Download File
                    </a>
                  )}
                  {resource.content && (
                    <button type="button" onClick={() => openPrintableResource(resource)} className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                      Open & Print
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}