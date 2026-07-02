export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center w-full max-w-[240px] ${className}`}>
      <img src="/assets/logos/icon.png" alt="Kosmos CRM" className="w-full h-auto object-contain" />
    </div>
  )
}
