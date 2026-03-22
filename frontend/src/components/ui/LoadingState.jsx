import { Loader2 } from "lucide-react";

export default function LoadingState({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
      <Loader2 className="animate-spin" size={20} />
      <p className="text-sm">{message}</p>
    </div>
  );
}
