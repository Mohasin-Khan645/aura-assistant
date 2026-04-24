import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { type AddressStyle, type AriaMemory, sanitizeName } from "@/lib/aria-memory";

const STYLE_OPTIONS: { value: AddressStyle; label: string; hint: string }[] = [
  { value: "first_name", label: "First name", hint: "ARIA calls you by your first name." },
  { value: "full_name", label: "Full name", hint: "ARIA uses your full name." },
  { value: "sir", label: "Sir", hint: 'Classic Jarvis-style "sir".' },
  { value: "boss", label: "Boss", hint: 'Casual "boss".' },
  { value: "none", label: "No salutation", hint: "ARIA never addresses you by name." },
];

export const SettingsDialog = ({
  open,
  onOpenChange,
  memory,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  memory: AriaMemory;
  onSave: (patch: Partial<AriaMemory>) => void;
}) => {
  const [name, setName] = useState(memory.userName ?? "Mohasin Khan");
  const [style, setStyle] = useState<AddressStyle>(memory.addressStyle ?? "first_name");

  useEffect(() => {
    if (open) {
      setName(memory.userName ?? "Mohasin Khan");
      setStyle(memory.addressStyle ?? "first_name");
    }
  }, [open, memory]);

  const handleSave = () => {
    const clean = sanitizeName(name);
    if (!clean) {
      toast.error("Name can't be empty");
      return;
    }
    onSave({ userName: clean, addressStyle: style });
    toast.success(`ARIA will address you accordingly, ${clean.split(" ")[0]}`);
    onOpenChange(false);
  };

  const activeHint = STYLE_OPTIONS.find((o) => o.value === style)?.hint;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display tracking-wider">Personalization</DialogTitle>
          <DialogDescription>
            Tell ARIA what to call you. Used in every reply.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="aria-name">Your name</Label>
            <Input
              id="aria-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="e.g. Mohasin Khan"
              className="bg-secondary/40 border-primary/20"
            />
            <p className="text-[11px] text-muted-foreground font-mono">
              Max 60 chars. Special characters are stripped.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="aria-style">Preferred addressing</Label>
            <Select value={style} onValueChange={(v) => setStyle(v as AddressStyle)}>
              <SelectTrigger id="aria-style" className="bg-secondary/40 border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeHint && (
              <p className="text-[11px] text-muted-foreground font-mono">{activeHint}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
