export default function EmptyState({ message = "No data found." }) {
  return (
    <div className="bg-white border rounded-2xl p-10 text-center text-slate-500 text-sm">
      {message}
    </div>
  );
}
