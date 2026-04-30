// Editable command templates for the launcher.
// Built-ins are merged with user-defined custom templates from localStorage.

export type TemplateCategory = "Quick" | "Productivity" | "Creative" | "Web" | "System" | "Custom";

export type CommandTemplate = {
  id: string;
  label: string;
  prompt: string;        // may contain {{var}} placeholders
  category: TemplateCategory;
  icon?: string;         // lucide icon name (resolved by caller)
  builtin?: boolean;
};

const KEY = "aria.commandTemplates.v1";

export const BUILTIN_TEMPLATES: CommandTemplate[] = [
  { id: "open-yt",      label: "Open YouTube",            prompt: "Open YouTube",                                category: "Web",          icon: "Globe",     builtin: true },
  { id: "open-gmail",   label: "Open Gmail",              prompt: "Open Gmail",                                  category: "Web",          icon: "Mail",      builtin: true },
  { id: "open-github",  label: "Open GitHub",             prompt: "Open GitHub",                                 category: "Web",          icon: "Github",    builtin: true },
  { id: "weather",      label: "Check weather",           prompt: "What's the weather right now?",               category: "Quick",        icon: "Cloud",     builtin: true },
  { id: "image",        label: "Generate an image",       prompt: "Generate an image of {{subject}}",            category: "Creative",     icon: "Image",     builtin: true },
  { id: "calc",         label: "Quick calculation",       prompt: "Calculate {{expression}}",                    category: "Quick",        icon: "Calculator",builtin: true },
  { id: "search",       label: "Search the web",          prompt: "Search Google for {{query}}",                 category: "Web",          icon: "Search",    builtin: true },
  { id: "time",         label: "What time is it?",        prompt: "What time is it?",                            category: "Quick",        icon: "Clock",     builtin: true },
  { id: "summarize",    label: "Summarize text",          prompt: "Summarize the following in 5 bullet points:\n\n{{text}}", category: "Productivity", icon: "FileText", builtin: true },
  { id: "translate",    label: "Translate text",          prompt: "Translate to {{language}}:\n\n{{text}}",      category: "Productivity", icon: "Languages", builtin: true },
  { id: "explain-code", label: "Explain code",            prompt: "Explain this code step by step:\n\n```\n{{code}}\n```", category: "Productivity", icon: "Code", builtin: true },
  { id: "brainstorm",   label: "Brainstorm ideas",        prompt: "Brainstorm 10 creative ideas about {{topic}}", category: "Creative",    icon: "Sparkles",  builtin: true },
  { id: "briefing",     label: "Daily briefing",          prompt: "Give me my morning briefing",                  category: "Quick",       icon: "Sun",       builtin: true },
  { id: "list-tasks",   label: "Show my tasks",           prompt: "List my tasks",                                category: "Productivity",icon: "ListChecks",builtin: true },
];

export function loadCustomTemplates(): CommandTemplate[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CommandTemplate[];
    return Array.isArray(parsed) ? parsed.map((t) => ({ ...t, category: "Custom", builtin: false })) : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplates(list: CommandTemplate[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
}

export function getAllTemplates(): CommandTemplate[] {
  return [...BUILTIN_TEMPLATES, ...loadCustomTemplates()];
}

/** Replace {{placeholders}} by prompting via window.prompt. Returns null if the user cancelled. */
export function fillTemplate(prompt: string): string | null {
  const re = /\{\{\s*([\w-]+)\s*\}\}/g;
  let result = prompt;
  const placeholders = Array.from(new Set(Array.from(prompt.matchAll(re)).map((m) => m[1])));
  for (const p of placeholders) {
    const value = window.prompt(`Enter value for "${p}":`, "");
    if (value === null) return null;
    result = result.replace(new RegExp(`\\{\\{\\s*${p}\\s*\\}\\}`, "g"), value);
  }
  return result;
}
