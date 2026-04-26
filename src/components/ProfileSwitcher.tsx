import { useState } from "react";
import { UserPlus, Trash2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { type AriaProfile, createProfile } from "@/lib/aria-profiles";
import type { AddressStyle } from "@/lib/aria-memory";
import { cn } from "@/lib/utils";

const STYLES: { value: AddressStyle; label: string }[] = [
  { value: "first_name", label: "First name" },
  { value: "full_name", label: "Full name" },
  { value: "sir", label: "Sir" },
  { value: "boss", label: "Boss" },
  { value: "none", label: "No salutation" },
];

export const ProfileSwitcher = ({
  open,
  onOpenChange,
  profiles,
  activeId,
  onSwitch,
  onCreate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profiles: AriaProfile[];
  activeId: string;
  onSwitch: (id: string) => void;
  onCreate: (p: AriaProfile) => void;
  onDelete: (id: string) => void;
}) => {
  const [newName, setNewName] = useState("");
  const [newStyle, setNewStyle] = useState<AddressStyle>("first_name");

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("Enter a name");
      return;
    }
    const p = createProfile(newName, newStyle);
    onCreate(p);
    setNewName("");
    toast.success(`Profile created: ${p.name}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Profiles
          </DialogTitle>
          <DialogDescription>
            Switch between users — each profile keeps its own conversation and preferences.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[40vh] overflow-y-auto">
          {profiles.map((p) => {
            const active = p.id === activeId;
            return (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2.5",
                  active ? "border-primary/60 bg-primary/10" : "border-primary/15 bg-secondary/40",
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                    {p.addressStyle}{active ? " · active" : ""}
                  </p>
                </div>
                {!active && (
                  <Button size="sm" variant="ghost" onClick={() => { onSwitch(p.id); onOpenChange(false); }}>
                    Switch
                  </Button>
                )}
                {profiles.length > 1 && !active && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onDelete(p.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-primary/15 pt-4 space-y-2">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Add new profile
          </p>
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Name"
              maxLength={60}
              className="bg-secondary/40 border-primary/20"
            />
            <Select value={newStyle} onValueChange={(v) => setNewStyle(v as AddressStyle)}>
              <SelectTrigger className="w-[140px] bg-secondary/40 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <UserPlus className="w-4 h-4 mr-1.5" /> Create profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
