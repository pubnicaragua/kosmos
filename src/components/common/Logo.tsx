export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-0 ${className}`}>
      <span className="text-2xl font-semibold text-primary-light">CORP</span>
      <span className="text-2xl font-semibold text-primary-dark">CRM</span>
    </div>
  )
}
