import React, { useState } from "react";
import { useApp, LABEL_COLOR_OPTIONS } from "../context/AppContext";

export default function LabelCustomizerModal({ isOpen, onClose }) {
  const {
    taskLabels,
    addCustomLabel,
    updateCustomLabel,
    deleteCustomLabel,
    resetCustomLabels,
    getLabelStyle,
  } = useApp();

  const [filterType, setFilterType] = useState("all"); // 'all' | 'priority' | 'category'
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelType, setNewLabelType] = useState("priority"); // 'priority' | 'category'
  const [newLabelColor, setNewLabelColor] = useState("primary");
  const [editingLabelId, setEditingLabelId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("primary");
  const [editType, setEditType] = useState("priority");
  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleAddLabel = async (e) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;

    await addCustomLabel({
      name: newLabelName.trim(),
      type: newLabelType,
      color: newLabelColor,
    });

    setNewLabelName("");
  };

  const handleStartEdit = (label) => {
    setEditingLabelId(label.id);
    setEditName(label.name);
    setEditColor(label.color || "primary");
    setEditType(label.type || "category");
  };

  const handleSaveEdit = async (id) => {
    if (!editName.trim()) return;
    await updateCustomLabel(id, {
      name: editName.trim(),
      color: editColor,
      type: editType,
    });
    setEditingLabelId(null);
  };

  const handleDelete = async (id) => {
    await deleteCustomLabel(id);
    if (editingLabelId === id) setEditingLabelId(null);
  };

  const handleResetDefaults = async () => {
    await resetCustomLabels();
    setConfirmReset(false);
  };

  const filteredLabels = taskLabels.filter((l) => {
    if (filterType === "priority") return l.type === "priority";
    if (filterType === "category") return l.type === "category";
    return true;
  });

  const previewStyle =
    LABEL_COLOR_OPTIONS.find((c) => c.key === newLabelColor) || LABEL_COLOR_OPTIONS[0];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15 bg-surface-container-low/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">label</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Label &amp; Priority Customizer
              </h2>
              <p className="font-body-sm text-body-sm text-outline">
                Customize priority badges, category tags, and color themes across your workspace
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Add New Custom Label Form */}
          <section className="p-4 rounded-xl bg-surface-container-low/60 border border-outline-variant/20 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">add_circle</span>
                Create New Label or Priority
              </span>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm text-outline">Preview:</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold border ${previewStyle.bg} ${previewStyle.border}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${previewStyle.dot}`} />
                  {newLabelName.trim() || (newLabelType === "priority" ? "P1 Urgent" : "Sprint Label")}
                </span>
              </div>
            </div>

            <form onSubmit={handleAddLabel} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Name */}
                <div className="sm:col-span-6">
                  <label className="block text-label-sm font-medium text-outline mb-1">
                    Label Name
                  </label>
                  <input
                    type="text"
                    placeholder={newLabelType === "priority" ? "e.g. P0 Blocker, Critical" : "e.g. Frontend, Design System"}
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface outline-none border border-outline-variant/30 focus:border-primary text-body-sm"
                    required
                  />
                </div>

                {/* Type Selection */}
                <div className="sm:col-span-6">
                  <label className="block text-label-sm font-medium text-outline mb-1">
                    Type
                  </label>
                  <div className="flex p-0.5 rounded-lg bg-surface-container border border-outline-variant/20">
                    <button
                      type="button"
                      onClick={() => setNewLabelType("priority")}
                      className={`flex-1 py-1.5 px-2 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        newLabelType === "priority"
                          ? "bg-surface-container-lowest text-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">flag</span>
                      Priority Tier
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewLabelType("category")}
                      className={`flex-1 py-1.5 px-2 rounded-md font-label-sm text-label-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        newLabelType === "category"
                          ? "bg-surface-container-lowest text-primary shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">category</span>
                      Category Tag
                    </button>
                  </div>
                </div>
              </div>

              {/* Color Swatch Picker */}
              <div>
                <label className="block text-label-sm font-medium text-outline mb-1.5">
                  Color Accent
                </label>
                <div className="flex flex-wrap gap-2">
                  {LABEL_COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setNewLabelColor(c.key)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-label-sm font-medium cursor-pointer transition-all border ${
                        newLabelColor === c.key
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-surface-container-lowest font-bold shadow-xs " + c.bg
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-transparent"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      <span>{c.label.split(" / ")[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Button */}
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={!newLabelName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Add Label</span>
                </button>
              </div>
            </form>
          </section>

          {/* Existing Labels List */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-label-md text-label-md font-bold text-on-surface">
                Workspace Labels ({filteredLabels.length})
              </span>

              {/* Filter Tabs */}
              <div className="flex p-0.5 rounded-lg bg-surface-container-high gap-0.5">
                {[
                  { key: "all", label: "All" },
                  { key: "priority", label: "Priorities" },
                  { key: "category", label: "Categories" },
                ].map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setFilterType(t.key)}
                    className={`px-3 py-1 rounded-md text-label-sm font-label-sm transition-all cursor-pointer ${
                      filterType === t.key
                        ? "bg-surface-container-lowest text-on-surface font-semibold shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-outline-variant/15 rounded-xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
              {filteredLabels.length === 0 ? (
                <div className="p-8 text-center text-outline">
                  <span className="material-symbols-outlined text-2xl text-outline mb-1">label_off</span>
                  <p className="font-body-sm text-body-sm">No labels found for this filter.</p>
                </div>
              ) : (
                filteredLabels.map((label) => {
                  const isEditing = editingLabelId === label.id;
                  const labelStyle = getLabelStyle(label.name);

                  if (isEditing) {
                    return (
                      <div key={label.id} className="p-3 bg-surface-container-low/80 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="sm:col-span-6 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-body-sm outline-none border border-primary"
                            autoFocus
                          />
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="sm:col-span-3 px-2 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-label-sm outline-none cursor-pointer"
                          >
                            <option value="priority">Priority</option>
                            <option value="category">Category</option>
                          </select>
                          <select
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="sm:col-span-3 px-2 py-1.5 rounded-lg bg-surface-container-lowest text-on-surface text-label-sm outline-none cursor-pointer"
                          >
                            {LABEL_COLOR_OPTIONS.map((c) => (
                              <option key={c.key} value={c.key}>
                                {c.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingLabelId(null)}
                            className="px-3 py-1 rounded-lg text-label-sm text-outline hover:text-on-surface hover:bg-surface-container cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(label.id)}
                            className="px-3 py-1 rounded-lg bg-primary text-on-primary text-label-sm font-semibold hover:bg-primary-container cursor-pointer"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={label.id}
                      className="flex items-center justify-between p-3 hover:bg-surface-container-low/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Type indicator */}
                        <span className="w-16 px-1.5 py-0.5 rounded text-[10px] uppercase font-tabular-mono font-bold text-outline bg-surface-container text-center flex-shrink-0">
                          {label.type === "priority" ? "Priority" : "Category"}
                        </span>

                        {/* Live badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold border ${labelStyle.bg} ${labelStyle.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${labelStyle.dot}`} />
                          <span className="truncate">{label.name}</span>
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(label)}
                          className="p-1.5 rounded-lg text-outline hover:text-primary hover:bg-surface-container cursor-pointer transition-colors"
                          title="Edit Label"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(label.id)}
                          className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error-container/20 cursor-pointer transition-colors"
                          title="Delete Label"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/15 bg-surface-container-low/40">
          <div>
            {confirmReset ? (
              <div className="flex items-center gap-2">
                <span className="text-label-sm text-error font-medium">Reset all labels to system defaults?</span>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-2.5 py-1 rounded-lg bg-error text-on-error font-label-sm text-label-sm font-semibold cursor-pointer"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-1 rounded-lg bg-surface-container text-outline font-label-sm text-label-sm cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="text-label-sm font-label-sm text-outline hover:text-error transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                Reset to Defaults
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold hover:bg-primary-container hover:text-on-primary-container transition-all cursor-pointer shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
