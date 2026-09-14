import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

export function DragHandle({ listeners, attributes, testid }) {
  return (
    <button
      type="button"
      className="mono text-mute hover:text-ink cursor-grab active:cursor-grabbing touch-none px-1"
      data-testid={testid}
      {...attributes}
      {...listeners}
    >
      <GripVertical size={16} />
    </button>
  );
}

export function SortableItem({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
}
