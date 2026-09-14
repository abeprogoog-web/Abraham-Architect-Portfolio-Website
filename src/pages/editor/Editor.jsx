import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, arrayMove,
} from "@dnd-kit/sortable";
import {
  adminLogin, adminVerify, adminFetchAll, adminDelete, adminReorder,
  adminUpdate, adminSyncToCode, getToken, setToken, clearToken, WORLDS, pad,
} from "@/lib/api";
import { SortableItem, DragHandle } from "@/components/editor/SortableItem";
import ProjectForm from "./ProjectForm";
import SettingsView from "./SettingsView";

function Login({ onSuccess }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { token } = await adminLogin(passcode);
      setToken(token);
      onSuccess();
    } catch {
      setError("Wrong passcode");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4" data-testid="editor-login">
      <form onSubmit={submit} className="w-full max-w-sm border border-line p-8">
        <div className="font-bold lowercase tracking-tight text-sm">abearchitectstudio</div>
        <div className="mono text-mute mt-1 mb-8">Private editor</div>
        <label className="mono text-mute block mb-2" htmlFor="passcode">Passcode</label>
        <input
          id="passcode"
          data-testid="passcode-input"
          type="password"
          className="e-input"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          autoFocus
        />
        {error && <div className="mono text-accent mt-3" data-testid="login-error">{error}</div>}
        <button type="submit" data-testid="login-submit-button" className="e-btn e-btn-solid w-full mt-6" disabled={busy}>
          {busy ? "Entering…" : "Enter editor"}
        </button>
      </form>
    </div>
  );
}

function WorldGroup({ world, list, allProjects, onReordered, toggle, remove, setEditing, setView }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = list.findIndex((p) => p.id === active.id);
    const newIndex = list.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(list, oldIndex, newIndex);
    onReordered(world.key, reordered);
    try {
      await adminReorder(reordered.map((p) => p.id));
    } catch {
      toast.error("Reorder failed");
    }
  };

  return (
    <div className="mb-10">
      <div className="mono text-mute hairline-b pb-2 mb-2" data-testid={`world-group-${world.key}`}>
        {world.title} — {list.length}
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={list.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {list.map((p, gi) => (
            <SortableItem key={p.id} id={p.id}>
              {({ attributes, listeners }) => (
                <div className="hairline-b py-3 flex items-center gap-4 bg-paper" data-testid={`editor-row-${p.slug}`}>
                  <DragHandle attributes={attributes} listeners={listeners} testid={`drag-handle-${p.slug}`} />
                  <span className="mono text-mute w-8">{pad(gi)}</span>
                  {p.cover ? (
                    <img src={p.cover} alt="" className="w-16 h-11 object-cover border border-line" />
                  ) : (
                    <div className="w-16 h-11 border border-line" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{p.title}</div>
                    <div className="mono text-mute">{p.category} — {p.year}</div>
                  </div>
                  <button
                    data-testid={`toggle-publish-${p.slug}`}
                    onClick={() => toggle(p, "published")}
                    className={`mono px-3 py-1 border ${p.published ? "bg-ink text-paper border-transparent" : "border-line text-mute"}`}
                    title="Publish / unpublish"
                  >
                    {p.published ? "Published" : "Draft"}
                  </button>
                  <button
                    data-testid={`toggle-featured-${p.slug}`}
                    onClick={() => toggle(p, "featured")}
                    className={`mono px-3 py-1 border ${p.featured ? "text-accent border-accent" : "border-line text-mute"}`}
                    title="Show on home page"
                  >
                    {p.featured ? "Featured" : "Feature"}
                  </button>
                  <a
                    href={`/project/${p.slug}${p.published ? "" : "?preview=1"}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="e-btn"
                    data-testid={`preview-${p.slug}`}
                  >
                    Preview
                  </a>
                  <button className="e-btn" data-testid={`edit-${p.slug}`} onClick={() => { setEditing(p); setView("form"); }}>
                    Edit
                  </button>
                  <button className="e-btn hover:!bg-accent hover:!border-accent" data-testid={`delete-${p.slug}`} onClick={() => remove(p)}>
                    Delete
                  </button>
                </div>
              )}
            </SortableItem>
          ))}
        </SortableContext>
      </DndContext>
      {list.length === 0 && (
        <div className="mono text-mute py-6">No projects yet — add one.</div>
      )}
    </div>
  );
}

export default function Editor() {
  const [authed, setAuthed] = useState(null);
  const [projects, setProjects] = useState([]);
  const [view, setView] = useState("list");
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = () => adminFetchAll().then(setProjects).catch(() => toast.error("Could not load projects"));

  useEffect(() => {
    if (!getToken()) return setAuthed(false);
    adminVerify()
      .then(() => setAuthed(true))
      .catch(() => { clearToken(); setAuthed(false); });
  }, []);

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  const handleSyncCode = async () => {
    setSyncing(true);
    try {
      const res = await adminSyncToCode();
      toast.success(res?.message || "Data & gambar berhasil disimpan permanen ke dalam coding!");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Gagal menyimpan ke code");
    } finally {
      setSyncing(false);
    }
  };

  if (authed === null) return <div className="min-h-screen bg-paper" />;
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;

  const toggle = async (p, field) => {
    try {
      await adminUpdate(p.id, { ...p, [field]: !p[field] });
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const remove = (p) => {
    setDeleteTarget(p);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminDelete(deleteTarget.id);
      toast.success(`"${deleteTarget.title}" deleted`);
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const onReordered = (worldKey, reorderedList) => {
    setProjects((prev) => {
      const others = prev.filter((p) => p.world !== worldKey);
      return [...others, ...reorderedList];
    });
  };

  if (view === "form")
    return (
      <ProjectForm
        initial={editing}
        onSaved={() => { setView("list"); setEditing(null); load(); }}
        onCancel={() => { setView("list"); setEditing(null); }}
        onDelete={async (projId) => {
          try {
            await adminDelete(projId);
            toast.success("Project deleted");
            setView("list");
            setEditing(null);
            load();
          } catch {
            toast.error("Delete failed");
          }
        }}
      />
    );

  if (view === "settings")
    return <SettingsView onBack={() => setView("list")} />;

  return (
    <div className="min-h-screen bg-paper text-ink" data-testid="editor-dashboard">
      <header className="hairline-b px-4 md:px-10 h-14 flex items-center justify-between sticky top-0 bg-paper/95 backdrop-blur-md z-10">
        <div className="flex items-center gap-4">
          <span className="font-bold lowercase tracking-tight text-sm">abearchitectstudio</span>
          <span className="mono text-mute">Editor</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="e-btn text-xs"
            data-testid="sync-code-header-button"
            disabled={syncing}
            onClick={handleSyncCode}
            title="Simpan seluruh gambar dan settingan editor ke codebase"
          >
            {syncing ? "Menyimpan ke Code…" : "💾 Masukkan ke Code"}
          </button>
          <a href="/" target="_blank" rel="noopener noreferrer" className="e-btn" data-testid="view-site-button">View site</a>
          <button className="e-btn" data-testid="settings-button" onClick={() => setView("settings")}>Settings</button>
          <button
            className="e-btn e-btn-solid"
            data-testid="add-project-button"
            onClick={() => { setEditing(null); setView("form"); }}
          >
            Add new project
          </button>
          <button className="e-btn" data-testid="logout-button" onClick={() => { clearToken(); setAuthed(false); }}>
            Log out
          </button>
        </div>
      </header>

      <div className="px-4 md:px-10 py-8 max-w-6xl">
        <div className="flex justify-between items-baseline mb-6">
          <h1 className="display text-3xl" data-testid="editor-heading">Projects</h1>
          <span className="mono text-mute">{projects.length} total</span>
        </div>

        {Object.values(WORLDS).map((w) => (
          <WorldGroup
            key={w.key}
            world={w}
            list={projects.filter((p) => p.world === w.key)}
            allProjects={projects}
            onReordered={onReordered}
            toggle={toggle}
            remove={remove}
            setEditing={setEditing}
            setView={setView}
          />
        ))}
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 bg-ink/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          data-testid="delete-confirm-modal"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div
            className="bg-paper border border-line p-6 sm:p-8 w-full max-w-md shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-bold lowercase tracking-tight text-xs text-mute mb-1">abearchitectstudio</div>
            <h3 className="display text-xl mb-3 text-ink">Delete Project</h3>
            <p className="text-sm text-mute leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-ink font-semibold">"{deleteTarget.title}"</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="e-btn"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="e-btn !bg-accent !text-paper !border-accent hover:opacity-90"
                onClick={confirmDelete}
                disabled={deleting}
                data-testid="confirm-delete-button"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
