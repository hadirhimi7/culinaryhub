// API Configuration - Change these for production hosting
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'
export const API_URL = `${API_BASE_URL}/api`

// Helper to get full image URL
export function getImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http')) return imagePath
  // Otherwise, prepend the API base URL
  return `${API_BASE_URL}${imagePath}`
}

