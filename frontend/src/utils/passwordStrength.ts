export type PasswordStrength = 'empty' | 'weak' | 'medium' | 'strong'

export function getPasswordStrength(password: string): {
  score: number
  label: PasswordStrength
} {
  if (!password) {
    return { score: 0, label: 'empty' }
  }

  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) {
    return { score, label: 'weak' }
  }
  if (score <= 3) {
    return { score, label: 'medium' }
  }
  return { score, label: 'strong' }
}


