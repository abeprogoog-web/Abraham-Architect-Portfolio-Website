import React from "react";

const POSITIONS = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
  { value: "top left", label: "Top Left" },
  { value: "top right", label: "Top Right" },
  { value: "bottom left", label: "Bottom Left" },
  { value: "bottom right", label: "Bottom Right" },
];

const GRID_CELLS = [
  { value: "top left", title: "Top Left" },
  { value: "top", title: "Top Center" },
  { value: "top right", title: "Top Right" },
  { value: "left", title: "Left Center" },
  { value: "center", title: "Center" },
  { value: "right", title: "Right Center" },
  { value: "bottom left", title: "Bottom Left" },
  { value: "bottom", title: "Bottom Center" },
  { value: "bottom right", title: "Bottom Right" },
];

export default function PositionPicker({ value = "center", onChange, label = "Position" }) {
  const currentVal = value || "center";
  const isKnown = POSITIONS.some((p) => p.value === currentVal);

  return (
    <div className="flex items-center gap-2">
      {label && <span className="mono text-mute text-xs">{label}:</span>}
      <select
        value={currentVal}
        onChange={(e) => onChange(e.target.value)}
        className="e-input !py-1 !w-auto text-xs"
      >
        {!isKnown && (
          <option value={currentVal}>
            Custom ({currentVal})
          </option>
        )}
        {POSITIONS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <div
        className="grid grid-cols-3 gap-0.5 p-0.5 border border-line bg-paper"
        title="Focal Point Anchor Grid"
      >
        {GRID_CELLS.map((cell) => {
          const isActive = currentVal === cell.value;
          return (
            <button
              key={cell.value}
              type="button"
              title={cell.title}
              onClick={() => onChange(cell.value)}
              className={`w-2.5 h-2.5 transition-colors ${
                isActive ? "bg-ink" : "bg-ink/10 hover:bg-ink/40"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
