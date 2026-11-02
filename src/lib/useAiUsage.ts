import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

export type AiUsage = { used: number; daily_limit: number; remaining: number }

export function useAiUsage() {
  const [usage, setUsage] = useState<AiUsage | null>(null)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc('ai_usage_today')
    setError(!!error)
    if (data?.[0]) setUsage(data[0])
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { usage, error, refresh }
}
