// Cloud sync layer for ARIA. Supabase data access for tasks, notes, reminders, settings.
import { supabase } from "@/integrations/supabase/client";

export type CloudTask = {
  id: string;
  title: string;
  notes: string | null;
  due_at: string | null;
  priority: string;
  done: boolean;
  done_at: string | null;
  created_at: string;
};

export type CloudNote = {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
  updated_at: string;
};

export type CloudReminder = {
  id: string;
  title: string;
  remind_at: string;
  notified: boolean;
};

export type CloudSettings = {
  user_id: string;
  wake_word_enabled: boolean;
  voice_enabled: boolean;
  theme: string;
  briefing_city: string | null;
  briefing_enabled: boolean;
};

export type CloudProfile = {
  user_id: string;
  display_name: string;
  address_style: string;
  avatar_url: string | null;
};

// Tasks
export async function listTasks(): Promise<CloudTask[]> {
  const { data, error } = await supabase
    .from("aria_tasks")
    .select("*")
    .order("done", { ascending: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CloudTask[];
}

export async function createTask(input: { title: string; notes?: string; due_at?: string | null; priority?: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("aria_tasks")
    .insert({
      user_id: u.user.id,
      title: input.title,
      notes: input.notes ?? null,
      due_at: input.due_at ?? null,
      priority: input.priority ?? "normal",
    })
    .select()
    .single();
  if (error) throw error;
  return data as CloudTask;
}

export async function setTaskDone(id: string, done: boolean) {
  const { error } = await supabase
    .from("aria_tasks")
    .update({ done, done_at: done ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("aria_tasks").delete().eq("id", id);
  if (error) throw error;
}

// Notes
export async function listNotes(): Promise<CloudNote[]> {
  const { data, error } = await supabase
    .from("aria_notes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CloudNote[];
}

export async function createNote(input: { title?: string; content: string; tags?: string[] }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("aria_notes")
    .insert({
      user_id: u.user.id,
      title: input.title ?? "Untitled",
      content: input.content,
      tags: input.tags ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data as CloudNote;
}

export async function updateNote(id: string, patch: Partial<{ title: string; content: string; tags: string[] }>) {
  const { error } = await supabase.from("aria_notes").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteNote(id: string) {
  const { error } = await supabase.from("aria_notes").delete().eq("id", id);
  if (error) throw error;
}

// Reminders
export async function listReminders(): Promise<CloudReminder[]> {
  const { data, error } = await supabase
    .from("aria_reminders")
    .select("*")
    .order("remind_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CloudReminder[];
}

export async function createReminder(title: string, remind_at: Date) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("aria_reminders")
    .insert({ user_id: u.user.id, title, remind_at: remind_at.toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data as CloudReminder;
}

export async function markReminderNotified(id: string) {
  const { error } = await supabase.from("aria_reminders").update({ notified: true }).eq("id", id);
  if (error) throw error;
}

export async function deleteReminder(id: string) {
  const { error } = await supabase.from("aria_reminders").delete().eq("id", id);
  if (error) throw error;
}

// Settings
export async function getSettings(): Promise<CloudSettings | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase.from("aria_settings").select("*").eq("user_id", u.user.id).maybeSingle();
  if (error) throw error;
  return data as CloudSettings | null;
}

export async function updateSettings(patch: Partial<Omit<CloudSettings, "user_id">>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase.from("aria_settings").update(patch).eq("user_id", u.user.id);
  if (error) throw error;
}

// Profile
export async function getProfile(): Promise<CloudProfile | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase.from("profiles").select("user_id, display_name, address_style, avatar_url").eq("user_id", u.user.id).maybeSingle();
  if (error) throw error;
  return data as CloudProfile | null;
}

export async function updateProfile(patch: Partial<Pick<CloudProfile, "display_name" | "address_style" | "avatar_url">>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { error } = await supabase.from("profiles").update(patch).eq("user_id", u.user.id);
  if (error) throw error;
}
