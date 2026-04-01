"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Plus, Check, Trash2, Edit3, X, Save,
  Zap, MessageCircle, Briefcase, ChevronDown,
} from "lucide-react";
import { templateApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Template {
  id: string;
  name: string;
  description: string;
  tone: "warm" | "apologetic" | "professional" | "custom";
  is_active: boolean;
  prompt_instructions: string;
  example_response: string;
  usage_count: number;
  created_at: string;
}

const TONE_OPTIONS = [
  { value: "warm", label: "Warm & Grateful", icon: "🤗", color: "#F59E0B" },
  { value: "apologetic", label: "Empathetic & Recovery", icon: "🙏", color: "#60A5FA" },
  { value: "professional", label: "Professional & Brief", icon: "💼", color: "#A78BFA" },
  { value: "custom", label: "Custom Tone", icon: "✍️", color: "#4ADE80" },
];

const STARTER_INSTRUCTIONS = {
  warm: "Respond warmly with genuine gratitude. Mention specific dishes from the review. Highlight our culinary heritage. End with a warm invitation to return.",
  apologetic: "Acknowledge the issue fully. Apologize sincerely without excuses. Explain corrective action taken. Offer a resolution or discount. Invite them back with assurance.",
  professional: "Keep under 80 words. Acknowledge the rating. One sentence addressing their specific feedback. Professional closing.",
  custom: "",
};

export default function AITemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    templateApi.list().then((data) => setTemplates(data as Template[])).finally(() => setLoading(false));
  }, []);

  const handleSetActive = async (id: string) => {
    try {
      await templateApi.setActive(id);
      setTemplates((prev) => prev.map((t) => ({ ...t, is_active: t.id === id })));
      toast.success("Active template updated!");
    } catch {
      toast.error("Failed to update active template");
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId !== id) { setDeletingId(id); return; } // first click arms, second confirms
    setDeletingId(null);
    try {
      await templateApi.delete(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleCreate = async (data: Partial<Template>) => {
    try {
      const created = await templateApi.create(data as Record<string, unknown>);
      setTemplates((prev) => [...prev, created as Template]);
      setShowCreateForm(false);
      toast.success("Template created!");
    } catch {
      toast.error("Failed to create template");
    }
  };

  const handleUpdate = async (id: string, data: Partial<Template>) => {
    try {
      await templateApi.update(id, data as Record<string, unknown>);
      setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
      setEditingId(null);
      toast.success("Template updated!");
    } catch {
      toast.error("Failed to update template");
    }
  };

  const activeTemplate = templates.find((t) => t.is_active);

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-[#FAFAFA] font-display font-semibold text-3xl mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          AI Response Templates
        </h1>
        <p className="text-[#71717A] text-sm">
          Craft the tone and style for your AI-generated review responses. One template is active at a time.
        </p>
      </div>

      {/* Active template callout */}
      {activeTemplate && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-[#7C3AED]/10 border border-[#7C3AED]/30 mb-6">
          <div className="w-8 h-8 rounded-xl bg-[#7C3AED]/20 flex items-center justify-center">
            <Zap size={15} className="text-[#A78BFA]" />
          </div>
          <div>
            <p className="text-[#A78BFA] text-sm font-semibold">Currently active: {activeTemplate.name}</p>
            <p className="text-[#71717A] text-xs mt-0.5">All new AI responses will use this template's tone and instructions.</p>
          </div>
          <span className="ml-auto px-3 py-1 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/20 text-[#4ADE80] text-xs font-semibold">
            ● Active
          </span>
        </div>
      )}

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { step: "1", icon: MessageCircle, title: "Customer reviews", desc: "A customer rates and writes a review for their order" },
          { step: "2", icon: Sparkles, title: "AI generates response", desc: "Gemini AI crafts a personalized reply using your active template" },
          { step: "3", icon: Zap, title: "Email delivered", desc: "Response is sent to the customer's email with CC to your restaurant" },
        ].map(({ step, icon: Icon, title, desc }) => (
          <div key={step} className="bg-[#111113] border border-[#27272A] rounded-2xl p-4">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#7C3AED]/20 flex items-center justify-center text-[#A78BFA] text-xs font-bold">{step}</div>
              <Icon size={14} className="text-[#A78BFA]" />
            </div>
            <p className="text-[#FAFAFA] text-sm font-medium mb-1">{title}</p>
            <p className="text-[#71717A] text-xs leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Templates */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[#FAFAFA] font-semibold">Your Templates ({templates.length})</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-medium hover:bg-[#6D28D9] transition-all"
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4"
          >
            <TemplateForm
              onSubmit={handleCreate}
              onCancel={() => setShowCreateForm(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{Array(3).fill(null).map((_, i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>
      ) : (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id}>
              {editingId === tmpl.id ? (
                <TemplateForm
                  template={tmpl}
                  onSubmit={(data) => handleUpdate(tmpl.id, data)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <TemplateCard
                  template={tmpl}
                  onSetActive={() => handleSetActive(tmpl.id)}
                  onEdit={() => setEditingId(tmpl.id)}
                  onDelete={() => handleDelete(tmpl.id)}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Template Card ──

function TemplateCard({ template: t, onSetActive, onEdit, onDelete }: {
  template: Template;
  onSetActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tone = TONE_OPTIONS.find((o) => o.value === t.tone) ?? TONE_OPTIONS[0];

  return (
    <div className={cn(
      "bg-[#111113] border rounded-2xl overflow-hidden transition-all",
      t.is_active ? "border-[#7C3AED]/40" : "border-[#27272A]"
    )}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{tone.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[#FAFAFA] font-semibold">{t.name}</h3>
                {t.is_active && (
                  <span className="px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] text-[10px] font-bold border border-[#7C3AED]/30">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[#71717A] text-xs mt-0.5">{t.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!t.is_active && (
              <button
                onClick={onSetActive}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 text-[#A78BFA] text-xs font-medium hover:bg-[#7C3AED]/20 transition-all"
              >
                <Check size={12} /> Set Active
              </button>
            )}
            <button onClick={onEdit} className="w-7 h-7 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] hover:text-[#FAFAFA] transition-all">
              <Edit3 size={12} />
            </button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-[#18181B] border border-[#27272A] flex items-center justify-center text-[#71717A] hover:text-[#F87171] transition-all">
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-[#71717A]">
          <span>Used {t.usage_count} times</span>
          <span className="px-2 py-0.5 rounded-md" style={{ background: `${tone.color}15`, color: tone.color }}>
            {tone.label}
          </span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mt-3 text-[#71717A] text-xs hover:text-[#A1A1AA] transition-colors"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronDown size={12} className="rotate-[-90deg]" />}
          {expanded ? "Hide" : "View"} instructions
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="border-t border-[#27272A] p-5 bg-[#0D0D10]">
              <p className="text-[#71717A] text-xs font-semibold uppercase tracking-wider mb-2">Prompt Instructions</p>
              <p className="text-[#A1A1AA] text-sm leading-relaxed bg-[#18181B] border border-[#27272A] rounded-xl p-3">
                {t.prompt_instructions}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Template Form ──

function TemplateForm({ template, onSubmit, onCancel }: {
  template?: Template;
  onSubmit: (data: Partial<Template>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: template?.name ?? "",
    description: template?.description ?? "",
    tone: template?.tone ?? "warm" as Template["tone"],
    prompt_instructions: template?.prompt_instructions ?? "",
  });
  const [saving, setSaving] = useState(false);

  const handleToneChange = (tone: Template["tone"]) => {
    setForm((f) => ({
      ...f,
      tone,
      prompt_instructions: f.prompt_instructions || STARTER_INSTRUCTIONS[tone] || "",
    }));
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error("Template name is required"); return; }
    if (!form.prompt_instructions.trim()) { toast.error("Instructions are required"); return; }
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };

  return (
    <div className="bg-[#111113] border border-[#7C3AED]/30 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[#FAFAFA] font-semibold">{template ? "Edit Template" : "New Template"}</h3>
        <button onClick={onCancel} className="text-[#71717A] hover:text-[#FAFAFA] transition-colors"><X size={16} /></button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[#A1A1AA] text-xs font-medium mb-1.5">Template Name *</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Warm & Grateful"
              className="w-full px-3 py-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm placeholder-[#71717A] outline-none focus:border-[#7C3AED]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[#A1A1AA] text-xs font-medium mb-1.5">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of this template"
              className="w-full px-3 py-2.5 rounded-xl bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm placeholder-[#71717A] outline-none focus:border-[#7C3AED]/50 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[#A1A1AA] text-xs font-medium mb-2">Tone</label>
          <div className="flex flex-wrap gap-2">
            {TONE_OPTIONS.map(({ value, label, icon, color }) => (
              <button
                key={value}
                onClick={() => handleToneChange(value as Template["tone"])}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all",
                  form.tone === value
                    ? "border-[#7C3AED]/50 bg-[#7C3AED]/10 text-[#A78BFA]"
                    : "border-[#27272A] bg-[#18181B] text-[#A1A1AA] hover:text-[#FAFAFA]"
                )}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[#A1A1AA] text-xs font-medium mb-1.5">
            AI Prompt Instructions *
            <span className="ml-2 text-[#71717A] font-normal normal-case">Tell Gemini how to respond</span>
          </label>
          <textarea
            value={form.prompt_instructions}
            onChange={(e) => setForm((f) => ({ ...f, prompt_instructions: e.target.value }))}
            placeholder="Write detailed instructions for how the AI should craft responses. Include tone, what to highlight, how to handle complaints, etc."
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-[#18181B] border border-[#27272A] text-[#FAFAFA] text-sm placeholder-[#71717A] outline-none focus:border-[#7C3AED]/50 transition-colors resize-none"
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} className="px-5 py-2.5 rounded-xl border border-[#27272A] text-[#A1A1AA] text-sm hover:bg-[#18181B] transition-all">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all",
              saving ? "bg-[#7C3AED]/30 text-[#A78BFA] cursor-not-allowed" : "bg-[#7C3AED] text-white hover:bg-[#6D28D9]"
            )}
          >
            <Save size={14} />
            {saving ? "Saving..." : template ? "Update Template" : "Create Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
