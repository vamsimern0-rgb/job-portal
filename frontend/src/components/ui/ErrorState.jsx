export default function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="bg-white border rounded-2xl p-8 text-center">
      <p className="text-sm text-rose-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-2 text-sm rounded-lg border border-slate-300 hover:bg-slate-50"
        >
          Retry
        </button>
      )}
    </div>
  );
}
