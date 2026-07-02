export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src="/assets/logos/icon.png" alt="Kosmos CRM" className="h-8 w-8 object-contain" />
      <div className="flex items-center gap-0">
        <span className="text-2xl font-semibold text-primary-light">Kosmos</span>
        <span className="text-2xl font-semibold text-primary-dark">CRM</span>
      </div>
    </div>
  )
}
