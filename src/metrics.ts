export const metrics = [
  { key: 'risk_score', label: 'Индекс риска', unit: 'из 100', group: 'Риск' },
  { key: 'alder_pollen', label: 'Пыльца ольхи', unit: 'зёрен/м³', group: 'Пыльца' },
  { key: 'birch_pollen', label: 'Пыльца берёзы', unit: 'зёрен/м³', group: 'Пыльца' },
  { key: 'grass_pollen', label: 'Пыльца злаков', unit: 'зёрен/м³', group: 'Пыльца' },
  { key: 'mugwort_pollen', label: 'Пыльца полыни', unit: 'зёрен/м³', group: 'Пыльца' },
  { key: 'olive_pollen', label: 'Пыльца оливы', unit: 'зёрен/м³', group: 'Пыльца' },
  { key: 'ragweed_pollen', label: 'Пыльца амброзии', unit: 'зёрен/м³', group: 'Пыльца' },
  { key: 'pm10', label: 'Частицы PM10', unit: 'мкг/м³', group: 'Воздух' },
  { key: 'pm2_5', label: 'Частицы PM2.5', unit: 'мкг/м³', group: 'Воздух' },
  { key: 'carbon_monoxide', label: 'Угарный газ · CO', unit: 'мкг/м³', group: 'Воздух' },
  { key: 'nitrogen_dioxide', label: 'Диоксид азота · NO₂', unit: 'мкг/м³', group: 'Воздух' },
  { key: 'sulphur_dioxide', label: 'Диоксид серы · SO₂', unit: 'мкг/м³', group: 'Воздух' },
  { key: 'ozone', label: 'Озон · O₃', unit: 'мкг/м³', group: 'Воздух' },
  { key: 'european_aqi', label: 'Европейский AQI', unit: 'индекс', group: 'Воздух' },
  { key: 'us_aqi', label: 'Американский AQI', unit: 'индекс', group: 'Воздух' },
  { key: 'temperature_2m', label: 'Температура', unit: '°C', group: 'Погода' },
  { key: 'relative_humidity_2m', label: 'Влажность', unit: '%', group: 'Погода' },
]

export const riskLevels = {
  low: { label: 'Низкий', range: '0–24,99', color: '#3d7853' },
  moderate: { label: 'Умеренный', range: '25–49,99', color: '#a17c22' },
  high: { label: 'Высокий', range: '50–74,99', color: '#bd6c2d' },
  very_high: { label: 'Очень высокий', range: '75–100', color: '#b74c49' },
}

export const number = (value: number | null | undefined) => value == null
  ? 'Нет данных'
  : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)

export const dateTime = (value: string | number) => new Date(value).toLocaleString('ru-RU', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
