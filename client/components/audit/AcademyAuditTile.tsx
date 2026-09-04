/**
 * Academy Audit Tile — displays academy courses in a grid with
 * screenshot status, notes per course, and ability to add new courses.
 */
import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import { toast } from "sonner";

interface AcademyCourse {
  label: string;
  url: string;
  screenshotUploaded: boolean;
  notes: string | null;
}

interface AcademyAuditTileProps {
  courses: AcademyCourse[];
  topicKey: string;
  isApproved: boolean;
  onApproved?: () => void;
  onSaved?: () => void;
  sectionKey: string;
}

export default function AcademyAuditTile({
  courses,
  topicKey,
  isApproved,
  onApproved,
  onSaved,
  sectionKey,
}: AcademyAuditTileProps) {
  const { viewer } = useViewer();
  const { run: saveApproval, loading: approving } = useApi("SaveAuditApproval");
  const { run: saveContent, loading: saving } = useApi("SaveAuditContent");

  // Per-course notes (local state — persisted on save)
  const [courseNotes, setCourseNotes] = useState<Record<number, string>>({});

  // Add new academy course
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const handleApprove = useCallback(async () => {
    try {
      await saveApproval({
        viewerId: viewer?.id ?? "",
        topicKey,
        sectionKey,
        approved: !isApproved,
      });
      toast.success(isApproved ? "Approval removed" : "Section approved ✅");
      onApproved?.();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Approval failed: " + msg);
    }
  }, [saveApproval, viewer, topicKey, sectionKey, isApproved, onApproved]);

  const handleSaveNotes = useCallback(async (index: number, notes: string) => {
    try {
      await saveContent({
        viewerId: viewer?.id ?? "",
        viewerName: viewer?.name ?? "",
        topicKey,
        editType: "academy_notes",
        fieldName: `academy_course_${index}`,
        oldValue: null,
        newValue: notes,
        questionId: null,
        clipId: null,
        gearIndex: index,
        gearLabel: courses[index]?.label ?? null,
        gearUrl: null,
        gearType: null,
      });
      toast.success("Notes saved");
      onSaved?.();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Save failed: " + msg);
    }
  }, [saveContent, viewer, topicKey, courses, onSaved]);

  const handleAddCourse = useCallback(async () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    try {
      await saveContent({
        viewerId: viewer?.id ?? "",
        viewerName: viewer?.name ?? "",
        topicKey,
        editType: "gear_add",
        fieldName: null,
        oldValue: null,
        newValue: JSON.stringify({ label: `🎓 Academy: ${newLabel.trim()}`, url: newUrl.trim(), type: "academy" }),
        questionId: null,
        clipId: "topic",
        gearIndex: null,
        gearLabel: newLabel.trim(),
        gearUrl: newUrl.trim(),
        gearType: "academy",
      });
      toast.success("Academy course added");
      setNewLabel("");
      setNewUrl("");
      setAdding(false);
      onSaved?.();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Add failed: " + msg);
    }
  }, [saveContent, viewer, topicKey, newLabel, newUrl, onSaved]);

  return (
    <div className={`rounded-xl border ${isApproved ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 bg-white"} overflow-hidden`}>
      {/* Header */}
      <div className="bg-amber-700 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <div>
            <h3 className="text-sm font-bold text-white">Academy Courses</h3>
            <p className="text-[10px] text-amber-200">
              {courses.length} course{courses.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-amber-900 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg hover:bg-amber-200"
          >
            + Add Course
          </button>
          <button
            onClick={handleApprove}
            disabled={approving}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              isApproved
                ? "text-white/70 bg-white/10 border-white/20 hover:bg-white/20"
                : "text-white bg-white/20 border-white/30 hover:bg-white/30"
            }`}
          >
            {approving ? "…" : isApproved ? "Undo Approve" : "✅ Approve"}
          </button>
        </div>
      </div>

      {/* Course grid */}
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {courses.map((course, idx) => (
            <CourseCard
              key={idx}
              course={course}
              index={idx}
              notes={courseNotes[idx] ?? ""}
              onNotesChange={(val) => setCourseNotes(prev => ({ ...prev, [idx]: val }))}
              onSaveNotes={() => handleSaveNotes(idx, courseNotes[idx] ?? "")}
              saving={saving}
            />
          ))}
        </div>

        {/* Add new course form */}
        {adding && (
          <div className="mt-4 border border-amber-200 rounded-lg p-4 bg-amber-50/30">
            <p className="text-xs font-semibold text-gray-700 mb-2">Add New Academy Course</p>
            <p className="text-[10px] text-gray-500 mb-3">
              Add a link to an Amplitude Academy course. Learners will see this on the Approach screen with a "Go to Academy Course" button.
            </p>
            <div className="space-y-2">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Course name (e.g. Data Tables)"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-300 outline-none"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="Academy course URL"
                className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-300 outline-none"
              />
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <button
                onClick={() => { setAdding(false); setNewLabel(""); setNewUrl(""); }}
                className="text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCourse}
                disabled={saving || !newLabel.trim() || !newUrl.trim()}
                className="text-xs font-semibold text-white bg-amber-600 px-4 py-1.5 rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Saving…" : "💾 Add Course"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Individual course card — mirrors the learner Approach UX */
function CourseCard({
  course,
  index,
  notes,
  onNotesChange,
  onSaveNotes,
  saving,
}: {
  course: AcademyCourse;
  index: number;
  notes: string;
  onNotesChange: (val: string) => void;
  onSaveNotes: () => void;
  saving: boolean;
}) {
  const [showNotes, setShowNotes] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-gray-900">{course.label}</h4>
          <a
            href={course.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            🎓 Go to Academy Course ↗
          </a>
        </div>
      </div>

      {/* Notes toggle + input */}
      {!showNotes ? (
        <button
          onClick={() => setShowNotes(true)}
          className="text-[10px] text-indigo-600 hover:underline"
        >
          📝 Add notes…
        </button>
      ) : (
        <div className="space-y-1.5">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Notes about this course (corrections, updates needed, etc.)…"
            rows={2}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
          />
          <div className="flex justify-end gap-1.5">
            <button onClick={() => setShowNotes(false)} className="text-[10px] text-gray-400 hover:underline">
              Close
            </button>
            <button
              onClick={onSaveNotes}
              disabled={saving || !notes.trim()}
              className="text-[10px] font-semibold text-white bg-emerald-600 px-2.5 py-0.5 rounded hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "…" : "💾 Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
