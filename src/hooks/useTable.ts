import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Options {
  orderBy?: string
  ascending?: boolean
  select?: string // e.g. '*, players(*)'
  eq?: Record<string, string | number | boolean>
}

// Generic list + add/update/remove for one Supabase table. Every mutation returns an error message or null, then reloads.
export function useTable<T extends { id: string }>(table: string, opts: Options = {}) {
  const { orderBy = 'created_at', ascending = false, select = '*', eq } = opts
  const eqKey = JSON.stringify(eq ?? {})
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    let q = supabase.from(table).select(select).order(orderBy, { ascending })
    for (const [k, v] of Object.entries(JSON.parse(eqKey) as Record<string, string | number | boolean>)) q = q.eq(k, v)
    const { data, error: err } = await q
    if (err) setError(err.message)
    else {
      setRows((data ?? []) as unknown as T[])
      setError(null)
    }
    setLoading(false)
  }, [table, select, orderBy, ascending, eqKey])

  useEffect(() => {
    void load()
  }, [load])

  const add = async (values: Record<string, unknown>) => {
    const { error: err } = await supabase.from(table).insert(values)
    if (!err) await load()
    return err ? err.message : null
  }
  const update = async (id: string, values: Record<string, unknown>) => {
    const { error: err } = await supabase.from(table).update(values).eq('id', id)
    if (!err) await load()
    return err ? err.message : null
  }
  const remove = async (id: string) => {
    const { error: err } = await supabase.from(table).delete().eq('id', id)
    if (!err) await load()
    return err ? err.message : null
  }

  return { rows, loading, error, reload: load, add, update, remove }
}
