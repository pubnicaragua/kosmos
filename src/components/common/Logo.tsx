export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <img src="/assets/logos/icon.png" alt="Kosmos CRM" className="h-12 w-auto object-contain max-w-[200px]" />
    </div>
  )
}
