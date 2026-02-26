// Nicaragua-specific validation helpers

export const nicaraguaCedulaPattern = /^\d{3}-\d{6}-\d{4}[A-Z]$/
export const nicaraguaRucPattern = /^J\d{13}$/

export function formatCedula(value: string): string {
  // Remove all non-alphanumeric characters
  const cleaned = value.replace(/[^0-9A-Z]/gi, '').toUpperCase()
  
  // Format as XXX-XXXXXX-XXXXL
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  if (cleaned.length <= 13) return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 9)}-${cleaned.slice(9)}`
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 9)}-${cleaned.slice(9, 14)}`
}

export function formatRuc(value: string): string {
  // Remove all non-alphanumeric characters
  const cleaned = value.replace(/[^0-9J]/gi, '').toUpperCase()
  
  // Ensure it starts with J
  if (cleaned.length === 0) return ''
  if (cleaned[0] !== 'J') return 'J' + cleaned.replace(/J/g, '')
  
  // Limit to J + 13 digits
  return cleaned.slice(0, 14)
}

export function validateCedula(value: string): { valid: boolean; message?: string } {
  if (!value) return { valid: true }
  
  if (!nicaraguaCedulaPattern.test(value)) {
    const cleaned = value.replace(/[^0-9A-Z]/gi, '')
    if (cleaned.length < 14) {
      return { 
        valid: false, 
        message: `Faltan ${14 - cleaned.length} caracteres. Formato: 001-010190-0001A` 
      }
    }
    return { 
      valid: false, 
      message: 'Formato inválido. Debe ser: 001-010190-0001A' 
    }
  }
  
  return { valid: true }
}

export function validateRuc(value: string): { valid: boolean; message?: string } {
  if (!value) return { valid: true }
  
  if (!nicaraguaRucPattern.test(value)) {
    if (!value.startsWith('J')) {
      return { 
        valid: false, 
        message: 'RUC debe iniciar con J' 
      }
    }
    const cleaned = value.replace(/[^0-9]/g, '')
    if (cleaned.length < 13) {
      return { 
        valid: false, 
        message: `Faltan ${13 - cleaned.length} dígitos. Formato: J0310000000000` 
      }
    }
    return { 
      valid: false, 
      message: 'Formato inválido. Debe ser: J0310000000000 (J + 13 dígitos)' 
    }
  }
  
  return { valid: true }
}
