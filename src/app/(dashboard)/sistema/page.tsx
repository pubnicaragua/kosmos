'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SistemaPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/sistema/ajustes')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <p className="text-gray-500">Redirigiendo...</p>
    </div>
  )
}
