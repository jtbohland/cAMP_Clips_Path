/**
 * cAMP Gear Audit Tile — scoped version of GearSection for product_101 tiled layout.
 * Matches the gear audit UX used by all other SME audit topics.
 */
import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import { toast } from "sonner";

interface GearResource {
  label: string;
  url: string;
  type: string;
}

interface CampGearAuditTileProps {
  resources: GearResource[];
  topicKey: string;
  isApproved: boolean;
  onApproved?: () => void;
  onSaved?: () => void;
  sectionKey: string;
}

const GEAR_BADGE_STYLES: Record<string, string> = {
  slides: "bg-yellow-100 text-yellow-800",
  spekit: "bg-pink-100 text-pink-800",
  gdrive: "bg-green-100 text-green-800",
  zoom: "bg-blue-100 text-blue-800",
  slack: "bg-orange-200 text-orange-900",
  glean: "bg-indigo-100 text-indigo-800",
  mindtickle: "bg-orange-100 text-orange-800",
  sfdc: "bg-sky-100 text-sky-800",
  link: "bg-gray-100 text-gray-700",
  sheets: "bg-teal-100 text-teal-800",
};

const GEAR_TYPE_LABELS: Record<string, string> = {
  slides: "Slides",
  spekit: "Spekit",
  gdrive: "Google Drive",
  zoom: "Zoom",
  slack: "Slack",
  glean: "Glean",
  mindtickle: "MindTickle",
  sfdc: "Salesforce",
  link: "Link",
  sheets: "Sheets",
};

export default function CampGearAuditTile({
  resources,
  topicKey,
  isApproved,
  onApproved,
  onSaved,
  sectionKey,
}: CampGearAuditTileProps) {
  const { viewer } = useViewer();
  const { run: saveApproval, loading: approving } = useApi("SaveAuditApproval");
  const { run: saveContent, loading: saving } = useApi("SaveAuditContent");

  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");
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

  const handleCheck = (i: number) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const handleUpdate = useCallback(async (i: number) => {
    try {
      await saveContent({
        viewerId: viewer?.id ?? "",
        viewerName: viewer?.name ?? "",
        topicKey,
        editType: "gear_update",
        fieldName: null,
        oldValue: JSON.stringify(resources[i]),
        newValue: JSON.stringify({ label: editLabel, url: editUrl }),
        questionId: null,
        clipId: "topic",
        gearIndex: i,
        gearLabel: null,
        gearUrl: null,
        gearType: null,
      });
      toast.success("Updated");
      setEditingIdx(null);
      onSaved?.();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Update failed: " + msg);
    }
  }, [saveContent, viewer, topicKey, resources, editLabel, editUrl, onSaved]);

  const handleAdd = useCallback(async () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    try {
      await saveContent({
        viewerId: viewer?.id ?? "",
        viewerName: viewer?.name ?? "",
        topicKey,
        editType: "gear_add",
        fieldName: null,
        oldValue: null,
        newValue: null,
        questionId: null,
        clipId: "topic",
        gearIndex: null,
        gearLabel: newLabel.trim(),
        gearUrl: newUrl.trim(),
        gearType: "link",
      });
      toast.success("Gear added");
      setNewLabel("");
      setNewUrl("");
      setAdding(false);
      onSaved?.();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Add failed: " + msg);
    }
  }, [saveContent, viewer, topicKey, newLabel, newUrl, onSaved]);

  const allChecked = resources.length > 0 && checkedItems.size >= resources.length;

  return (
    <div className={`rounded-xl border ${isApproved ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 bg-white"} overflow-hidden`}>
      {/* Header */}
      <div className="bg-emerald-800 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎒</span>
          <div>
            <h3 className="text-sm font-bold text-white">cAMP Gear</h3>
            <p className="text-[10px] text-emerald-200">
              {checkedItems.size}/{resources.length} reviewed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-emerald-900 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-200"
          >
            + Add Gear
          </button>
          <button
            onClick={handleApprove}
            disabled={approving || (!allChecked && !isApproved)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
              isApproved
                ? "text-white/70 bg-white/10 border-white/20 hover:bg-white/20"
                : !allChecked
                  ? "text-white/40 bg-white/5 border-white/10 cursor-not-allowed"
                  : "text-white bg-white/20 border-white/30 hover:bg-white/30"
            }`}
          >
            {approving ? "…" : isApproved ? "Undo Approve" : !allChecked ? "✅ Review all first" : "✅ Approve"}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* SME responsibility note */}
        <div className="rounded-lg bg-red-50 border border-red-300 px-3 py-2 text-xs text-red-800">
          <strong>📋 SME Responsibility:</strong> Any changes needed to slides, decks, or docs linked below are <strong>your responsibility</strong> — not the enablement team's. If you identify necessary corrections, please fix them directly before approving this section.
        </div>

        {/* Gear list */}
        <div className="space-y-1.5">
          {resources.map((r, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-indigo-200 transition-colors">
              <input
                type="checkbox"
                checked={checkedItems.has(i)}
                onChange={() => handleCheck(i)}
                className="accent-emerald-600 h-4 w-4 flex-shrink-0"
              />
              {editingIdx === i ? (
                <div className="flex-1 flex gap-2 items-center">
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 outline-none" />
                  <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-300 outline-none" />
                  <button onClick={() => handleUpdate(i)} disabled={saving} className="text-xs font-semibold text-white bg-emerald-600 px-2.5 py-1 rounded">💾</button>
                  <button onClick={() => setEditingIdx(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                </div>
              ) : (
                <>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 flex items-center gap-2 text-sm font-medium ${checkedItems.has(i) ? "text-gray-400 line-through" : "text-gray-800"}`}
                  >
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${GEAR_BADGE_STYLES[r.type] ?? "bg-gray-100 text-gray-700"}`}>
                      {GEAR_TYPE_LABELS[r.type] ?? r.type ?? "Link"}
                    </span>
                    <span>{r.label}</span>
                  </a>
                  <button
                    onClick={() => { setEditLabel(r.label); setEditUrl(r.url); setEditingIdx(i); }}
                    className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded hover:bg-indigo-100 font-medium"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add gear form */}
        {adding && (
          <div className="border border-emerald-200 rounded-lg p-3 bg-emerald-50/30">
            <p className="text-xs font-semibold text-gray-600 mb-2">Add new cAMP Gear resource</p>
            <div className="flex gap-2">
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (e.g. Pricing Deck)" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-emerald-300 outline-none" />
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="Paste URL" className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-emerald-300 outline-none" />
            </div>
            <div className="flex gap-2 mt-2 justify-end">
              <button onClick={() => { setAdding(false); setNewLabel(""); setNewUrl(""); }} className="text-xs text-gray-500 hover:underline">Cancel</button>
              <button onClick={handleAdd} disabled={saving || !newLabel.trim() || !newUrl.trim()} className="text-xs font-semibold text-white bg-emerald-600 px-3 py-1 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                {saving ? "Saving…" : "💾 Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
