import { useEffect } from 'react'

const BASE_TITLE = 'CulinaryHub'

export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${BASE_TITLE}` : BASE_TITLE
    
    // Reset title when component unmounts
    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}

