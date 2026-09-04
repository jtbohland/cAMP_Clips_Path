/**
 * Wheel & Deal Audit Tile — SME can view the product list (read-only),
 * flag products for removal, suggest new products (with required resource link),
 * and leave general notes. Cannot edit or remove products directly.
 */
import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import { useViewer } from "@/components/ViewerContext";
import { toast } from "sonner";

interface WheelProduct {
  name: string;
  flaggedForRemoval: boolean;
}

type SmeNote = { fieldName: string; value: string; viewerName: string; changeType: string; createdAt: string };

interface WheelAndDealAuditTileProps {
  products: WheelProduct[];
  wheelUrl: string;
  topicKey: string;
  isApproved: boolean;
  onApproved?: () => void;
  onSaved?: () => void;
  sectionKey: string;
  smeNotes?: SmeNote[];
}

export default function WheelAndDealAuditTile({
  products,
  wheelUrl,
  topicKey,
  isApproved,
  onApproved,
  onSaved,
  sectionKey,
  smeNotes = [],
}: WheelAndDealAuditTileProps) {
  const { viewer } = useViewer();
  const { run: saveApproval, loading: approving } = useApi("SaveAuditApproval");
  const { run: saveContent, loading: saving } = useApi("SaveAuditContent");

  // Products with local removal flags
  const [flagged, setFlagged] = useState<Set<string>>(
    () => new Set(products.filter(p => p.flaggedForRemoval).map(p => p.name))
  );

  // General notes
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  // Add product state
  const [adding, setAdding] = useState(false);
  const [newProduct, setNewProduct] = useState("");
  const [newResource, setNewResource] = useState("");
  const [newResourceName, setNewResourceName] = useState("");

  // Suggested products (local additions)
  const [suggestions, setSuggestions] = useState<Array<{ name: string; resource: string; resourceName: string }>>([]);

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

  const handleToggleFlag = useCallback((productName: string) => {
    setFlagged(prev => {
      const next = new Set(prev);
      if (next.has(productName)) {
        next.delete(productName);
      } else {
        next.add(productName);
      }
      return next;
    });
  }, []);

  const handleSaveNotes = useCallback(async () => {
    if (!notes.trim()) return;
    try {
      await saveContent({
        viewerId: viewer?.id ?? "",
        viewerName: viewer?.name ?? "",
        topicKey,
        editType: "wheel_notes",
        fieldName: "wheel_deal_notes",
        oldValue: null,
        newValue: JSON.stringify({
          notes: notes.trim(),
          flaggedForRemoval: Array.from(flagged),
          suggestedProducts: suggestions,
        }),
        questionId: null,
        clipId: null,
        gearIndex: null,
        gearLabel: null,
        gearUrl: null,
        gearType: null,
      });
      toast.success("Wheel & Deal feedback saved");
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
      onSaved?.();
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as any).message) : String(err);
      toast.error("Save failed: " + msg);
    }
  }, [saveContent, viewer, topicKey, notes, flagged, suggestions, onSaved]);

  const handleAddProduct = useCallback(() => {
    if (!newProduct.trim() || !newResource.trim() || !newResourceName.trim()) return;
    setSuggestions(prev => [
      ...prev,
      { name: newProduct.trim(), resource: newResource.trim(), resourceName: newResourceName.trim() },
    ]);
    setNewProduct("");
    setNewResource("");
    setNewResourceName("");
    setAdding(false);
  }, [newProduct, newResource, newResourceName]);

  const handleRemoveSuggestion = useCallback((index: number) => {
    setSuggestions(prev => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className={`rounded-xl border ${isApproved ? "border-emerald-200 bg-emerald-50/20" : "border-gray-200 bg-white"} overflow-hidden`}>
      {/* Header */}
      <div className="bg-indigo-700 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎡</span>
          <div>
            <h3 className="text-sm font-bold text-white">Wheel & Deal</h3>
            <p className="text-[10px] text-indigo-200">Product pitch simulation game</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={wheelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-indigo-900 bg-indigo-100 border border-indigo-300 px-2.5 py-1 rounded-lg hover:bg-indigo-200"
          >
            🎡 View Wheel & Deal ↗
          </a>
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

      <div className="p-4 space-y-4">
        {/* Read-only context note */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
          <strong>📋 Your role:</strong> Review the product list below. You <strong>cannot</strong> directly edit or remove products — instead, flag any that should be removed and leave notes for your admin. You can also suggest new products to add (a source of truth / resource link is required).
        </div>

        {/* Product list */}
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-2">Products on the Wheel ({products.length})</p>
          <div className="space-y-1.5">
            {products.map((product) => (
              <div
                key={product.name}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                  flagged.has(product.name)
                    ? "border-red-200 bg-red-50"
                    : "border-gray-100 bg-gray-50/50"
                }`}
              >
                <span className={`text-sm flex-1 ${flagged.has(product.name) ? "text-red-600 line-through" : "text-gray-800 font-medium"}`}>
                  {product.name}
                </span>
                <button
                  onClick={() => handleToggleFlag(product.name)}
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded border transition-colors ${
                    flagged.has(product.name)
                      ? "text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100"
                      : "text-red-600 bg-red-50 border-red-200 hover:bg-red-100"
                  }`}
                >
                  {flagged.has(product.name) ? "Unflag" : "🚩 Flag for removal"}
                </button>
              </div>
            ))}
          </div>

          {flagged.size > 0 && (
            <div className="mt-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              <strong>{flagged.size} product{flagged.size > 1 ? "s" : ""} flagged for removal.</strong> Your admin will review and decide.
            </div>
          )}
        </div>

        {/* Suggested new products */}
        {suggestions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">✨ Suggested Additions</p>
            <div className="space-y-2">
              {suggestions.map((s, i) => (
                <div key={i} className="rounded-lg border border-emerald-200 bg-emerald-50/30 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    <button
                      onClick={() => handleRemoveSuggestion(i)}
                      className="text-[10px] text-red-400 hover:text-red-600"
                    >
                      ✕ Remove
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Resource: <a href={s.resource} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{s.resourceName}</a>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add product form */}
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
          >
            + Suggest a Product
          </button>
        ) : (
          <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50/30 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Suggest New Product</p>
            <input
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              placeholder="Product name (e.g. Data Tables)"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none"
            />
            <input
              value={newResourceName}
              onChange={(e) => setNewResourceName(e.target.value)}
              placeholder="Resource name (e.g. Data Tables Pitch Deck)"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none"
            />
            <input
              value={newResource}
              onChange={(e) => setNewResource(e.target.value)}
              placeholder="Resource / source of truth URL (required)"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none"
            />
            {!newResource.trim() && newProduct.trim() && (
              <p className="text-[10px] text-amber-700">
                ⚠️ A resource link is <strong>required</strong> — sellers need a source of truth to know how to talk about this product.
              </p>
            )}
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => { setAdding(false); setNewProduct(""); setNewResource(""); setNewResourceName(""); }}
                className="text-xs text-gray-500 hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={!newProduct.trim() || !newResource.trim() || !newResourceName.trim()}
                className="text-xs font-semibold text-white bg-indigo-600 px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                ➕ Add Suggestion
              </button>
            </div>
          </div>
        )}

        {/* General notes */}
        <div>
          {/* Saved SME notes */}
          {smeNotes.filter(n => n.fieldName.startsWith("wheel_")).length > 0 && (
            <div className="mb-3 space-y-1.5">
              {smeNotes.filter(n => n.fieldName.startsWith("wheel_")).map((note, ni) => (
                <div key={ni} className="bg-indigo-50 border border-indigo-200 rounded-md px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-indigo-700">💬 {note.viewerName}</span>
                    <span className="text-[10px] text-indigo-500">{new Date(note.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-gray-800 whitespace-pre-wrap">{note.value}</p>
                </div>
              ))}
            </div>
          )}
          <label className="block text-xs font-semibold text-gray-600 mb-1">📝 Notes for Admin</label>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
            placeholder="Notes about Wheel & Deal — products to add/remove, accuracy issues, etc.…"
            rows={3}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
          />
          <div className="flex justify-end mt-1.5">
            <button
              onClick={handleSaveNotes}
              disabled={saving || (!notes.trim() && flagged.size === 0 && suggestions.length === 0)}
              className="text-xs font-semibold text-white bg-emerald-600 px-4 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : notesSaved ? "✅ Saved" : "💾 Save Feedback"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
