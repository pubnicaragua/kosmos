// Nicaragua-specific validation helpers

export const nicaraguaCedulaPattern = /^\d{3}-\d{6}-\d{4}[A-Z]$/
// RUC can be Juridical (J + 13 digits) or Natural (13 digits + 1 letter, like Cedula without dashes)
export const nicaraguaRucPattern = /^(J\d{13}|\d{13}[A-Z])$/i

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
  // Remove all non-alphanumeric characters and uppercase
  const cleaned = value.replace(/[^0-9A-Z]/gi, '').toUpperCase()
  
  // Limit to 14 characters
  return cleaned.slice(0, 14)
}

export function validateCedula(value: string): { valid: boolean; message?: string } {
  if (!value) return { valid: true }
  
  if (!nicaraguaCedulaPattern.test(value)) {
    const cleaned = value.replace(/[^0-9A-Z]/gi, '')
    if (cleaned.length < 14) {
      return { 
        valid: false, 
        message: `Faltan ${14 - cleaned.length} caracteres. Formato: 000-000000-0000L` 
      }
    }
    return { 
      valid: false, 
      message: 'Formato inválido. Debe ser: 000-000000-0000L' 
    }
  }
  
  return { valid: true }
}

export function validateRuc(value: string): { valid: boolean; message?: string } {
  if (!value) return { valid: true }
  
  if (!nicaraguaRucPattern.test(value)) {
    const cleaned = value.replace(/[^0-9A-Z]/gi, '')
    
    if (cleaned.length < 14) {
      return { 
        valid: false, 
        message: `Faltan ${14 - cleaned.length} caracteres (14 requeridos)` 
      }
    }
    return { 
      valid: false, 
      message: 'Formato inválido. Debe ser J + 13 dígitos o Cédula sin guiones' 
    }
  }
  
  return { valid: true }
}
