'use client'

import { useState, useEffect, useCallback } from 'react'

export function useCompany() {
  const [selectedCompany, setSelectedCompany] = useState<string>('all')

  const loadActiveCompany = useCallback(() => {
    const stored = localStorage.getItem('activeCompany')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.id) {
          setSelectedCompany(parsed.id)
        }
      } catch (err) {
        console.error('Error parsing activeCompany:', err)
      }
    }
  }, [])

  useEffect(() => {
    loadActiveCompany()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'activeCompany') {
        loadActiveCompany()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [loadActiveCompany])

  return {
    selectedCompany,
    setSelectedCompany,
  }
}
