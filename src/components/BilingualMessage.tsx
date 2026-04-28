// Bilingual transcript renderer — shows original + translated under it.
import { useEffect, useState } from "react";
import { Languages, Loader2 } from "lucide-react";
import { translate, detectScript } from "@/lib/aria-translate";

interface Props {
  text: string;
  /** Target language code, e.g. "hi" or "en". */
  targetLang: string;
}

export function BilingualMessage({ text, targetLang }: Props) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const src = detectScript(text);
  const tgt = targetLang.slice(0, 2);
  const sameLang = src === tgt;

  useEffect(() => {
    if (sameLang) { setTranslated(null); return; }
    let cancelled = false;
    setLoading(true);
    translate(text, tgt, src).then((t) => {
      if (!cancelled) setTranslated(t === text ? null : t);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [text, tgt, src, sameLang]);

  if (sameLang || (!translated && !loading)) return null;
  return (
    <div className="mt-2 pt-2 border-t border-primary/15 text-xs italic text-muted-foreground/90 flex items-start gap-1.5">
      <Languages className="w-3 h-3 mt-0.5 shrink-0 text-primary/60" />
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="break-words">{translated}</span>}
    </div>
  );
}
