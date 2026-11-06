import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { get, type Location, type Measurement, type MeasurementPage } from './api'
import { dateTime, metrics, number, riskLevels } from './metrics'

type Filters = { location: string; from: string; to: string; offset: number }
const colors = ['#365e48', '#527cb1', '#b56e3c', '#9368a4', '#28878b', '#ad526d']
const pageSize = 500
const localDate = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function period(location: Location, days: number | null) {
  if (days === null) return { from: '', to: '' }
  const end = new Date(location.last_observed_at)
  const start = new Date(end)
  start.setDate(start.getDate() - days + 1)
  return { from: localDate(start), to: localDate(end) }
}

function Message({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="message"><span className="message-icon" aria-hidden="true">∿</span><h3>{title}</h3><p>{children}</p></div>
}

export default function App() {
  const [locations, setLocations] = useState<Location[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [locationsError, setLocationsError] = useState('')
  const [filters, setFilters] = useState<Filters>({ location: '', from: '', to: '', offset: 0 })
  const [metricKey, setMetricKey] = useState('risk_score')
  const [preset, setPreset] = useState<number | null | 'custom'>(7)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const metric = metrics.find((item) => item.key === metricKey)!
  const location = locations.find((item) => item.id === filters.location)
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to)

  useEffect(() => {
    const controller = new AbortController()
    setLocationsLoading(true)
    setLocationsError('')
    get<{ items: Location[] }>('locations/', controller.signal)
      .then(({ items }) => {
        setLocations(items)
        setFilters((current) => {
          if (items.some((item) => item.id === current.location)) return current
          const first = items[0]
          return first
            ? { location: first.id, ...period(first, 7), offset: 0 }
            : { location: '', from: '', to: '', offset: 0 }
        })
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setLocationsError((reason as Error).message) })
      .finally(() => { if (!controller.signal.aborted) setLocationsLoading(false) })
    return () => controller.abort()
  }, [refresh])

  useEffect(() => {
    const controller = new AbortController()
    setError('')
    if (filters.offset === 0) {
      setMeasurements([])
      setHasMore(false)
    }
    if (!filters.location || invalidRange) {
      setLoading(false)
      return () => controller.abort()
    }
    setLoading(true)
    const query = new URLSearchParams({
      location_id: filters.location, order: 'desc', limit: String(pageSize), offset: String(filters.offset),
    })
    if (filters.from) query.set('time_from', new Date(`${filters.from}T00:00:00`).toISOString())
    if (filters.to) query.set('time_to', new Date(`${filters.to}T23:59:59.999`).toISOString())
    get<MeasurementPage>(`measurements/?${query}`, controller.signal)
      .then((page) => {
        setMeasurements((current) => {
          const combined = filters.offset === 0 ? page.items : [...current, ...page.items]
          return [...new Map(combined.map((item) => [item.id, item])).values()]
        })
        setHasMore(page.has_more)
      })
      .catch((reason: unknown) => { if (!controller.signal.aborted) setError((reason as Error).message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filters, invalidRange, refresh])

  const rows = useMemo(() => measurements.map((item) => ({
    ...item,
    timestamp: new Date(item.observed_at).getTime(),
    value: metricKey === 'risk_score' ? item.risk_score : item.metrics[metricKey] ?? null,
  })).sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id)), [measurements, metricKey])
  const stations = [...new Set(rows.map((item) => item.station_id))]
  const values = rows.flatMap((item) => item.value === null ? [] : [item.value])
  const minimum = values.reduce((result, value) => Math.min(result, value), Infinity)
  const maximum = values.reduce((result, value) => Math.max(result, value), -Infinity)
  const latest = rows.at(-1)
  const latestRisk = latest?.risk_level ? riskLevels[latest.risk_level] : null
  const initialLoading = loading && filters.offset === 0
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  function selectPeriod(days: number | null) {
    if (!location) return
    setPreset(days)
    setFilters({ location: location.id, ...period(location, days), offset: 0 })
  }

  function retry() {
    if (filters.offset) setFilters({ ...filters, offset: 0 })
    else setRefresh((value) => value + 1)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="brand"><span className="brand-icon" aria-hidden="true">∿</span><div><strong>Мониторинг аллергии</strong><span>Пыльца и качество воздуха</span></div></div>
        <span className="view-label">Просмотр измерений</span>
      </header>

      <main>
        <div className="page-heading"><div><p className="eyebrow">ДАННЫЕ НАБЛЮДЕНИЙ</p><h1>Динамика показателей</h1><p className="muted">Выберите место и период, чтобы посмотреть, как менялись значения.</p></div>
          <button className="button" onClick={retry} disabled={loading || locationsLoading}><span aria-hidden="true">↻</span> Обновить</button>
        </div>

        {locationsError && <div className="notice error" role="alert">{locationsError} <button onClick={retry}>Повторить</button></div>}

        <section className="panel filters" aria-label="Фильтры графика">
          <div className="filter-row">
            <label className="location-field">Локация<select value={filters.location} disabled={!locations.length} onChange={(event) => {
              const selected = locations.find((item) => item.id === event.target.value)!
              setPreset(7)
              setFilters({ location: selected.id, ...period(selected, 7), offset: 0 })
            }}>
              {!locations.length && <option value="">{locationsLoading ? 'Загрузка локаций…' : 'Нет доступных локаций'}</option>}
              {locations.map((item) => <option key={item.id} value={item.id}>{item.name || `${item.latitude}, ${item.longitude}`} · {item.latitude}, {item.longitude}</option>)}
            </select></label>
            <label className="metric-field">Показатель<select value={metricKey} onChange={(event) => setMetricKey(event.target.value)}>
              {['Риск', 'Пыльца', 'Воздух', 'Погода'].map((group) => <optgroup key={group} label={group}>{metrics.filter((item) => item.group === group).map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</optgroup>)}
            </select></label>
          </div>
          <div className="period-row">
            <div className="presets" role="group" aria-label="Период до последнего наблюдения">
              {([1, 7, 30, null] as const).map((days) => <button key={String(days)} disabled={!location} aria-pressed={preset === days} className={preset === days ? 'active' : ''} onClick={() => selectPeriod(days)}>{days === null ? 'Всё время' : days === 1 ? '1 день' : `${days} дней`}</button>)}
            </div>
            <div className="dates"><label>С<input type="date" aria-label="Начало периода" value={filters.from} onChange={(event) => { setPreset('custom'); setFilters({ ...filters, from: event.target.value, offset: 0 }) }} /></label><span aria-hidden="true">—</span><label>По<input type="date" aria-label="Конец периода" value={filters.to} onChange={(event) => { setPreset('custom'); setFilters({ ...filters, to: event.target.value, offset: 0 }) }} /></label></div>
          </div>
          <p className="filter-hint">Периоды отсчитываются от последнего наблюдения в локации. Время: {timezone}.</p>
          {invalidRange && <p className="field-error" role="alert">Начало периода должно быть не позже его конца.</p>}
        </section>

        <section className="panel chart-panel" aria-labelledby="chart-title" aria-busy={loading || locationsLoading}>
          <div className="chart-heading"><div><h2 id="chart-title">{metric.label}</h2><p className="muted">{location ? location.name || `${location.latitude}, ${location.longitude}` : 'Наблюдения по выбранной локации'} <span className="separator">/</span> {metric.unit}</p></div><span className="count">{initialLoading ? 'Загрузка…' : `${rows.length} измерений`}</span></div>

          {error && <div className="notice error" role="alert">{error} <button onClick={retry}>Повторить</button></div>}

          {locationsLoading || initialLoading ? <Message title="Загружаем измерения">Получаем данные с сервера…</Message>
            : locationsError && !location ? <Message title="Данные недоступны">Повторите запрос после восстановления соединения.</Message>
            : invalidRange ? <Message title="Проверьте период">Выберите корректные даты начала и конца.</Message>
            : !locations.length ? <Message title="Пока нет наблюдений">Локации появятся, когда эмулятор передаст первые измерения.</Message>
            : !rows.length ? <Message title={error ? 'Не удалось загрузить график' : 'За этот период нет измерений'}>Попробуйте другой период или другую локацию.</Message>
            : !values.length ? <Message title="Нет значений этого показателя">Измерения есть, но выбранный показатель в них отсутствует. Выберите другой показатель.</Message>
            : <>
              <div className="stats" aria-label="Значения среди загруженных измерений">
                <div><span>Последнее в периоде</span><strong>{number(latest?.value)} <small>{latest?.value != null && metric.unit}</small></strong><span>{latest && dateTime(latest.observed_at)}{stations.length > 1 && latest && ` · ${latest.station_id}`}</span></div>
                <div><span>Минимум</span><strong>{number(minimum)}</strong><span>среди загруженных значений</span></div>
                <div><span>Максимум</span><strong>{number(maximum)}</strong><span>среди загруженных значений</span></div>
                {metricKey === 'risk_score' && <div><span>Последний уровень риска</span><strong className="risk-name" style={{ color: latestRisk?.color }}>{latestRisk?.label || 'Нет данных'}</strong><span>по расчёту сервера</span></div>}
              </div>
              <div className="chart" role="img" aria-label={`${metric.label}: ${values.length} значений, минимум ${number(minimum)}, максимум ${number(maximum)}. Ниже доступна таблица значений.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rows} margin={{ top: 18, right: 20, bottom: 12, left: 0 }} accessibilityLayer>
                    <CartesianGrid stroke="#e8e9e2" strokeDasharray="3 4" vertical={false} />
                    <XAxis dataKey="timestamp" type="number" scale="time" domain={rows[0].timestamp === latest?.timestamp ? [rows[0].timestamp - 1800000, rows[0].timestamp + 1800000] : ['dataMin', 'dataMax']} tickFormatter={(value: number) => new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} minTickGap={45} tick={{ fontSize: 11, fill: '#74796f' }} tickLine={false} axisLine={{ stroke: '#dadfd5' }} />
                    <YAxis domain={metricKey === 'risk_score' ? [0, 100] : ['auto', 'auto']} width={65} tickFormatter={number} tick={{ fontSize: 12, fill: '#74796f' }} tickLine={false} axisLine={false} />
                    <Tooltip labelFormatter={(value) => dateTime(Number(value))} formatter={(value) => [`${number(value == null ? null : Number(value))} ${metric.unit}`, undefined]} contentStyle={{ border: '1px solid #dce1d6', borderRadius: 6, fontSize: 13 }} />
                    {metricKey === 'risk_score' && [25, 50, 75].map((value) => <ReferenceLine key={value} y={value} stroke="#b9b8a8" strokeDasharray="5 5" />)}
                    {stations.length > 1 && <Legend />}
                    {stations.map((station, index) => <Line key={station} data={rows.filter((item) => item.station_id === station)} name={station} type="linear" dataKey="value" stroke={colors[index % colors.length]} strokeWidth={2} dot={{ r: rows.length < 100 ? 3 : 1.5, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>}

          {!initialLoading && rows.length > 0 && <>
            <div className="chart-footnote"><span>Пропуски данных не считаются нулём. Каждая линия — отдельная станция.</span><span>{values.length} значений · {rows.length - values.length} пропусков</span></div>
            {metricKey === 'risk_score' && <div className="risk-legend">{Object.entries(riskLevels).map(([key, value]) => <span key={key}><i style={{ background: value.color }} />{value.label} <small>{value.range}</small></span>)}</div>}
            {hasMore && <div className="load-more"><p>Показаны последние {rows.length} измерений за выбранный период. Более ранние данные ещё не загружены.</p><button className="button" disabled={loading || Boolean(error) || filters.offset >= 100000} onClick={() => setFilters({ ...filters, offset: filters.offset + pageSize })}>{loading ? 'Загрузка…' : 'Загрузить более ранние'}</button>{filters.offset >= 100000 && <p>Достигнут предел API. Сузьте период для просмотра более ранних данных.</p>}</div>}
            <details className="data-table"><summary>Значения в таблице</summary><div className="table-scroll"><table><caption>{metric.label} · загруженные измерения, сначала новые</caption><thead><tr><th scope="col">Время наблюдения</th><th scope="col">Станция</th><th scope="col">Значение, {metric.unit}</th></tr></thead><tbody>{[...rows].reverse().map((item) => <tr key={item.id}><td>{dateTime(item.observed_at)}</td><td>{item.station_id}</td><td>{number(item.value)}</td></tr>)}</tbody></table></div></details>
          </>}
        </section>
        <footer><span>Источник измерений: Open-Meteo через эмулятор</span><span>Индекс риска — учебный показатель, не медицинская оценка.</span></footer>
      </main>
    </div>
  )
}
