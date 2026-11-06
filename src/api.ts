export interface Location {
  id: string
  name: string
  latitude: number
  longitude: number
  measurement_count: number
  last_observed_at: string
}

export interface Measurement {
  id: string
  location_id: string
  station_id: string
  observed_at: string
  metrics: Record<string, number | null>
  risk_score: number | null
  risk_level: 'low' | 'moderate' | 'high' | 'very_high' | null
}

export interface MeasurementPage {
  items: Measurement[]
  limit: number
  offset: number
  has_more: boolean
}

export async function get<T>(path: string, signal: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/v1/${path}`, { signal, headers: { Accept: 'application/json' } })
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('Не удалось подключиться к серверу. Проверьте соединение и доступность бэкенда.')
  }
  if (!response.ok) {
    if (response.status === 503) throw new Error('База данных временно недоступна. Попробуйте обновить данные позже.')
    if (response.status === 429) throw new Error('Слишком много запросов. Подождите немного и попробуйте снова.')
    throw new Error(`Не удалось получить данные (ошибка ${response.status}). Попробуйте ещё раз.`)
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Сервер вернул неверный ответ. Проверьте настройку проксирования /api/.')
  }
  return response.json() as Promise<T>
}
