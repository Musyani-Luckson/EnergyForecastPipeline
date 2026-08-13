import { Loader2 } from "lucide-react";

/** Full-screen centered spinner, used while auth state is being verified. */
export default function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex items-center gap-2.5 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </div>
  );
}
