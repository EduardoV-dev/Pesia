export function ExportButtons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <a
        href="/api/export?format=json"
        download
        className="font-display inline-flex items-center justify-center rounded-control bg-accent px-5 py-3.5 text-center text-sm font-extrabold text-accent-ink shadow-[0_10px_22px_rgba(234,88,12,0.28)] hover:opacity-90"
      >
        Descargar todo (.json)
      </a>
      <a
        href="/api/export?format=csv"
        download
        className="font-display inline-flex items-center justify-center rounded-control bg-surface-sunken px-5 py-3.5 text-center text-sm font-bold text-ink hover:opacity-80"
      >
        Descargar pesadas (.csv)
      </a>
    </div>
  )
}
