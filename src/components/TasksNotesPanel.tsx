// Tasks & Notes side panel for ARIA — cloud-synced.
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2, StickyNote, ListTodo, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  listTasks, createTask, setTaskDone, deleteTask,
  listNotes, createNote, deleteNote,
  type CloudTask, type CloudNote,
} from "@/lib/aria-cloud";

export function TasksNotesPanel({ refreshKey }: { refreshKey: number }) {
  const [tasks, setTasks] = useState<CloudTask[]>([]);
  const [notes, setNotes] = useState<CloudNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [newNote, setNewNote] = useState("");

  const refresh = async () => {
    try {
      const [t, n] = await Promise.all([listTasks(), listNotes()]);
      setTasks(t);
      setNotes(n);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [refreshKey]);

  const addTask = async () => {
    const t = newTask.trim();
    if (!t) return;
    try {
      const created = await createTask({ title: t });
      setTasks((p) => [created, ...p]);
      setNewTask("");
    } catch (e) {
      toast.error("Failed to add task");
    }
  };

  const toggleTask = async (id: string, done: boolean) => {
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, done } : t)));
    try { await setTaskDone(id, done); } catch { toast.error("Update failed"); void refresh(); }
  };
  const removeTask = async (id: string) => {
    setTasks((p) => p.filter((t) => t.id !== id));
    try { await deleteTask(id); } catch { toast.error("Delete failed"); void refresh(); }
  };

  const addNote = async () => {
    const c = newNote.trim();
    if (!c) return;
    try {
      const created = await createNote({ content: c, title: c.split("\n")[0].slice(0, 60) });
      setNotes((p) => [created, ...p]);
      setNewNote("");
    } catch { toast.error("Failed to save note"); }
  };
  const removeNote = async (id: string) => {
    setNotes((p) => p.filter((n) => n.id !== id));
    try { await deleteNote(id); } catch { toast.error("Delete failed"); void refresh(); }
  };

  return (
    <div className="aria-panel rounded-2xl p-4 flex flex-col h-full min-h-[300px]">
      <Tabs defaultValue="tasks" className="flex flex-col flex-1">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="tasks" className="gap-1.5"><ListTodo className="w-3.5 h-3.5" /> Tasks</TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="flex-1 flex flex-col mt-3 gap-2">
          <div className="flex gap-1.5">
            <Input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTask()}
              placeholder="New task…"
              className="h-9 text-sm"
            />
            <Button size="icon" onClick={addTask} className="h-9 w-9 shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>
          <ScrollArea className="flex-1 max-h-[40vh] pr-2">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-6">No tasks yet. Ask ARIA to add one.</p>
            ) : (
              <ul className="space-y-1.5">
                {tasks.map((t) => (
                  <li key={t.id} className="group flex items-start gap-2 p-2 rounded-lg hover:bg-secondary/40">
                    <button onClick={() => toggleTask(t.id, !t.done)} className="mt-0.5 shrink-0">
                      {t.done
                        ? <CheckCircle2 className="w-4 h-4 text-primary" />
                        : <Circle className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <span className={`flex-1 text-xs ${t.done ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                      {t.title}
                    </span>
                    <button onClick={() => removeTask(t.id)} className="opacity-0 group-hover:opacity-100 transition">
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="notes" className="flex-1 flex flex-col mt-3 gap-2">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Quick note…"
            className="text-sm min-h-[60px] resize-none"
          />
          <Button size="sm" onClick={addNote} className="self-end"><Plus className="w-3.5 h-3.5 mr-1" /> Save note</Button>
          <ScrollArea className="flex-1 max-h-[35vh] pr-2">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : notes.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 text-center py-6">No notes yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {notes.map((n) => (
                  <li key={n.id} className="group p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 relative">
                    <p className="text-xs font-medium text-foreground truncate pr-6">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{n.content}</p>
                    <button onClick={() => removeNote(n.id)} className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
