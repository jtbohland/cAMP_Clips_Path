/**
 * TEMPORARY: greyed-out, non-clickable notice shown in place of a clip's
 * Watch button (or its cAMP Quiz button) while the clip's content is rebuilt.
 */
export default function RenovationNotice({
  label = "🚧 Under renovation — auto-completed",
}: {
  label?: string;
}) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full py-2.5 rounded-lg text-sm font-semibold text-center bg-gray-100 text-gray-500 border border-dashed border-gray-300 cursor-default select-none"
    >
      {label}
    </div>
  );
}
