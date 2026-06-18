import { type CSSProperties, type TextareaHTMLAttributes, useEffect, useRef, useState } from 'react'
import './Improve.css'

interface ImproveItem {
  id: string
  text: string
}

interface ImproveSlotData {
  items: ImproveItem[]
  scores: Record<string, number>
}

interface ImproveYearData {
  notesByDay: Record<string, string>
  gratitudeByDay: Record<string, string>
  slots: Record<string, ImproveSlotData>
}

type ImproveStore = Record<string, ImproveYearData>

interface DayInfo {
  date: string
  label: string
  shortLabel: string
  dayOfMonth: number
  weekday: number
}

interface SlotInfo {
  index: number
  startDate: string
  endDate: string
  days: DayInfo[]
}

interface HeatmapCell {
  date: string
  month: number
  weekday: number
  weekIndex: number
  percentage: number
}

interface YearRanking {
  key: string
  label: string
  totalPoints: number
  fullCircles: number
}

const STORAGE_KEY = 'task-logger-improve-v2'
const HEATMAP_COLORS = ['#f1eaff', '#e7d6ff', '#cfb0ff', '#a56ef7', '#6f2de1']
const MAX_RATING = 5

function getTodayParts(): { year: number; month: number; day: number } {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
  }
}

function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month, day)
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getDayInfo(date: Date): DayInfo {
  return {
    date: formatIsoDate(date),
    label: date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    shortLabel: date.toLocaleDateString(undefined, { weekday: 'short' }),
    dayOfMonth: date.getDate(),
    weekday: date.getDay(),
  }
}

function getYearSlots(year: number): SlotInfo[] {
  const slots: SlotInfo[] = []
  const yearStart = createLocalDate(year, 0, 1)
  const yearEnd = createLocalDate(year + 1, 0, 1)
  let cursor = new Date(yearStart)
  let index = 0

  while (cursor < yearEnd) {
    const days: DayInfo[] = []
    const slotStart = new Date(cursor)

    for (let offset = 0; offset < 14 && cursor < yearEnd; offset += 1) {
      days.push(getDayInfo(cursor))
      cursor = addDays(cursor, 1)
    }

    slots.push({
      index,
      startDate: formatIsoDate(slotStart),
      endDate: days[days.length - 1].date,
      days,
    })

    index += 1
  }

  return slots
}

function getCurrentSlotIndex(year: number, slots: SlotInfo[]): number {
  const today = new Date()
  const todayIso = formatIsoDate(today)
  if (today.getFullYear() !== year) return 0
  const foundIndex = slots.findIndex((slot) => slot.days.some((day) => day.date === todayIso))
  return foundIndex >= 0 ? foundIndex : 0
}

function getScoreKey(date: string, itemId: string): string {
  return `${date}::${itemId}`
}

function getYearData(store: ImproveStore, year: number): ImproveYearData {
  return store[String(year)] ?? { notesByDay: {}, gratitudeByDay: {}, slots: {} }
}

function normalizeScoreValue(value: unknown): number {
  if (typeof value === 'boolean') return value ? MAX_RATING : 0
  if (typeof value !== 'number' || Number.isNaN(value)) return 0
  return Math.max(0, Math.min(MAX_RATING, Math.round(value)))
}

function normalizeSlotData(slotData: unknown): ImproveSlotData {
  const raw = typeof slotData === 'object' && slotData !== null ? slotData as Record<string, unknown> : {}
  const rawItems = Array.isArray(raw.items) ? raw.items : []
  const items = rawItems
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null
      const maybeItem = item as Record<string, unknown>
      return {
        id: typeof maybeItem.id === 'string' ? maybeItem.id : generateItemId(),
        text: typeof maybeItem.text === 'string' ? maybeItem.text : '',
      }
    })
    .filter((item): item is ImproveItem => item !== null)

  const sourceScores = raw.scores
  const legacyCompletions = raw.completions
  const mergedScores: Record<string, number> = {}

  if (typeof sourceScores === 'object' && sourceScores !== null) {
    Object.entries(sourceScores).forEach(([key, value]) => {
      const normalized = normalizeScoreValue(value)
      if (normalized > 0) mergedScores[key] = normalized
    })
  }

  if (typeof legacyCompletions === 'object' && legacyCompletions !== null) {
    Object.entries(legacyCompletions).forEach(([key, value]) => {
      const normalized = normalizeScoreValue(value)
      if (normalized > 0 && mergedScores[key] === undefined) {
        mergedScores[key] = normalized
      }
    })
  }

  return {
    items,
    scores: mergedScores,
  }
}

function getSlotData(store: ImproveStore, year: number, slotIndex: number): ImproveSlotData {
  const yearData = getYearData(store, year)
  return normalizeSlotData(yearData.slots[String(slotIndex)])
}

function setTextareaHeight(element: HTMLTextAreaElement | null): void {
  if (!element) return
  element.style.height = '0px'
  element.style.height = `${element.scrollHeight}px`
}

function noteHasContent(value: string | undefined): boolean {
  return Boolean(value && value.trim())
}

function getDayTotalScore(slotData: ImproveSlotData, date: string): number {
  if (slotData.items.length === 0) return 0
  return slotData.items.reduce((sum, item) => sum + (slotData.scores[getScoreKey(date, item.id)] ?? 0), 0)
}

function getDayCompletionPercentage(store: ImproveStore, year: number, date: string, slots: SlotInfo[]): number {
  const slot = slots.find((candidate) => candidate.days.some((day) => day.date === date))
  if (!slot) return 0
  const slotData = getSlotData(store, year, slot.index)
  if (slotData.items.length === 0) return 0
  return getDayTotalScore(slotData, date) / (slotData.items.length * MAX_RATING)
}

function getHeatmapCells(store: ImproveStore, year: number, slots: SlotInfo[]): HeatmapCell[] {
  const yearStart = createLocalDate(year, 0, 1)
  const yearEnd = createLocalDate(year + 1, 0, 1)
  const cells: HeatmapCell[] = []
  let cursor = new Date(yearStart)
  let dayIndex = 0

  while (cursor < yearEnd) {
    cells.push({
      date: formatIsoDate(cursor),
      month: cursor.getMonth(),
      weekday: cursor.getDay(),
      weekIndex: Math.floor((yearStart.getDay() + dayIndex) / 7),
      percentage: getDayCompletionPercentage(store, year, formatIsoDate(cursor), slots),
    })
    cursor = addDays(cursor, 1)
    dayIndex += 1
  }

  return cells
}

function getHeatmapColor(percentage: number): string {
  if (percentage >= 1) return HEATMAP_COLORS[4]
  if (percentage >= 0.7) return HEATMAP_COLORS[3]
  if (percentage >= 0.4) return HEATMAP_COLORS[2]
  if (percentage > 0) return HEATMAP_COLORS[1]
  return HEATMAP_COLORS[0]
}

function getMonthLabels(cells: HeatmapCell[]): Array<{ month: number; column: number; label: string }> {
  const labels: Array<{ month: number; column: number; label: string }> = []
  let lastMonth = -1

  cells.forEach((cell) => {
    if (cell.month === lastMonth) return
    lastMonth = cell.month
    labels.push({
      month: cell.month,
      column: cell.weekIndex,
      label: createLocalDate(2000, cell.month, 1).toLocaleDateString(undefined, { month: 'short' }),
    })
  })

  return labels
}

function normalizeTextKey(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function getYearRankings(store: ImproveStore, year: number, slots: SlotInfo[]): YearRanking[] {
  const rankings = new Map<string, YearRanking>()

  slots.forEach((slot) => {
    const slotData = getSlotData(store, year, slot.index)
    slotData.items.forEach((item) => {
      const textKey = normalizeTextKey(item.text)
      if (!textKey) return
      const totalPoints = slot.days.reduce(
        (sum, day) => sum + (slotData.scores[getScoreKey(day.date, item.id)] ?? 0),
        0,
      )
      if (totalPoints <= 0) return

      const existing = rankings.get(textKey)
      if (existing) {
        existing.totalPoints += totalPoints
        existing.fullCircles = existing.totalPoints / MAX_RATING
      } else {
        rankings.set(textKey, {
          key: textKey,
          label: item.text.trim(),
          totalPoints,
          fullCircles: totalPoints / MAX_RATING,
        })
      }
    })
  })

  return Array.from(rankings.values()).sort((a, b) => b.totalPoints - a.totalPoints)
}

function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  }
}

function describeRingSegment(index: number, total: number, outerRadius: number, innerRadius: number): string {
  const center = 24
  const startAngle = (360 / total) * index
  const endAngle = (360 / total) * (index + 1)
  const outerStart = polarToCartesian(center, center, outerRadius, endAngle)
  const outerEnd = polarToCartesian(center, center, outerRadius, startAngle)
  const innerStart = polarToCartesian(center, center, innerRadius, endAngle)
  const innerEnd = polarToCartesian(center, center, innerRadius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ')
}

function AutoGrowTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={1}
      ref={(element) => setTextareaHeight(element)}
      onInput={(event) => {
        setTextareaHeight(event.currentTarget)
        props.onInput?.(event)
      }}
    />
  )
}

export default function Improve() {
  const todayParts = getTodayParts()
  const trackerScrollRef = useRef<HTMLDivElement | null>(null)
  const dayHeaderRefs = useRef<Array<HTMLDivElement | null>>([])
  const [selectedYear, setSelectedYear] = useState(todayParts.year)
  const [showYearProgress, setShowYearProgress] = useState(true)
  const [showAllRankings, setShowAllRankings] = useState(false)
  const [store, setStore] = useState<ImproveStore>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return {}
      const parsed = JSON.parse(raw)
      return typeof parsed === 'object' && parsed !== null ? parsed as ImproveStore : {}
    } catch {
      return {}
    }
  })
  const initialSlots = getYearSlots(todayParts.year)
  const [selectedSlotIndex, setSelectedSlotIndex] = useState(getCurrentSlotIndex(todayParts.year, initialSlots))
  const [activePanel, setActivePanel] = useState<{ type: 'brainstorming' | 'gratitude'; date: string } | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  }, [store])

  const slots = getYearSlots(selectedYear)

  useEffect(() => {
    setSelectedSlotIndex((currentIndex) => {
      if (selectedYear === todayParts.year) {
        return getCurrentSlotIndex(selectedYear, slots)
      }
      return currentIndex < slots.length ? currentIndex : 0
    })
    setShowAllRankings(false)
  }, [selectedYear])

  const activeSlot = slots[selectedSlotIndex] ?? slots[0]
  const yearData = getYearData(store, selectedYear)
  const slotData = getSlotData(store, selectedYear, activeSlot.index)
  const previousSlotData = selectedSlotIndex > 0 ? getSlotData(store, selectedYear, selectedSlotIndex - 1) : null
  const heatmapCells = getHeatmapCells(store, selectedYear, slots)
  const monthLabels = getMonthLabels(heatmapCells)
  const totalHeatmapWeeks = (heatmapCells[heatmapCells.length - 1]?.weekIndex ?? 0) + 1
  const slotProgressDays = activeSlot.days.filter((day) =>
    getDayCompletionPercentage(store, selectedYear, day.date, slots) > 0,
  ).length
  const totalScore = Object.values(slotData.scores).reduce((sum, value) => sum + normalizeScoreValue(value), 0)
  const totalPossibleScore = slotData.items.length * activeSlot.days.length * MAX_RATING
  const trackerGridStyle = {
    gridTemplateColumns: `minmax(250px, 320px) repeat(${activeSlot.days.length}, minmax(84px, 1fr))`,
  }
  const yearRankings = getYearRankings(store, selectedYear, slots)
  const visibleRankings = showAllRankings ? yearRankings : yearRankings.slice(0, 10)
  const canCopyPrevious = Boolean(previousSlotData?.items.some((item) => item.text.trim()))
  const todayIso = formatIsoDate(new Date())
  const currentDayIndex = activeSlot.days.findIndex((day) => day.date === todayIso)
  const activePanelValue = activePanel
    ? (
      activePanel.type === 'brainstorming'
        ? (yearData.notesByDay[activePanel.date] ?? '')
        : (yearData.gratitudeByDay[activePanel.date] ?? '')
    )
    : ''

  const updateSlotData = (updater: (current: ImproveSlotData) => ImproveSlotData) => {
    setStore((currentStore) => {
      const yearKey = String(selectedYear)
      const currentYear = getYearData(currentStore, selectedYear)
      const currentSlot = getSlotData(currentStore, selectedYear, activeSlot.index)

      return {
        ...currentStore,
        [yearKey]: {
          ...currentYear,
          slots: {
            ...currentYear.slots,
            [String(activeSlot.index)]: updater(currentSlot),
          },
        },
      }
    })
  }

  const updateYearData = (updater: (current: ImproveYearData) => ImproveYearData) => {
    setStore((currentStore) => {
      const yearKey = String(selectedYear)
      const currentYear = getYearData(currentStore, selectedYear)
      return {
        ...currentStore,
        [yearKey]: updater(currentYear),
      }
    })
  }

  const addImproveItem = () => {
    updateSlotData((currentSlot) => ({
      ...currentSlot,
      items: [...currentSlot.items, { id: generateItemId(), text: '' }],
    }))
  }

  const copyPreviousSlotItems = () => {
    if (!previousSlotData) return

    updateSlotData((currentSlot) => {
      const existingKeys = new Set(
        currentSlot.items.map((item) => normalizeTextKey(item.text)).filter(Boolean),
      )

      const copiedItems = previousSlotData.items
        .filter((item) => item.text.trim())
        .filter((item) => !existingKeys.has(normalizeTextKey(item.text)))
        .map((item) => ({ id: generateItemId(), text: item.text }))

      if (copiedItems.length === 0) return currentSlot

      return {
        ...currentSlot,
        items: [...currentSlot.items, ...copiedItems],
      }
    })
  }

  const changeItemText = (itemId: string, nextText: string) => {
    updateSlotData((currentSlot) => ({
      ...currentSlot,
      items: currentSlot.items.map((item) => (
        item.id === itemId ? { ...item, text: nextText } : item
      )),
    }))
  }

  const removeItem = (itemId: string) => {
    updateSlotData((currentSlot) => {
      const nextScores = { ...currentSlot.scores }
      activeSlot.days.forEach((day) => {
        delete nextScores[getScoreKey(day.date, itemId)]
      })

      return {
        ...currentSlot,
        items: currentSlot.items.filter((item) => item.id !== itemId),
        scores: nextScores,
      }
    })
  }

  const changeRating = (date: string, itemId: string, nextRating: number) => {
    updateSlotData((currentSlot) => {
      const scoreKey = getScoreKey(date, itemId)
      const nextScores = { ...currentSlot.scores }
      const normalized = Math.max(0, Math.min(MAX_RATING, nextRating))

      if (normalized === 0) {
        delete nextScores[scoreKey]
      } else {
        nextScores[scoreKey] = normalized
      }

      return {
        ...currentSlot,
        scores: nextScores,
      }
    })
  }

  const scrollTrackerBy = (direction: 'left' | 'right') => {
    const container = trackerScrollRef.current
    if (!container) return
    const offset = Math.max(320, Math.floor(container.clientWidth * 0.7))
    container.scrollBy({
      left: direction === 'left' ? -offset : offset,
      behavior: 'smooth',
    })
  }

  const scrollToDay = (dayIndex: number) => {
    const target = dayHeaderRefs.current[dayIndex]
    if (!target) return
    target.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }

  return (
    <div className="improve">
      <div className="improve-header">
        <div>
          <h2>Improve</h2>
          <p>Score each day on your current 14-day focus list, carry strong themes forward, and watch the year fill in like a purple contribution graph.</p>
        </div>
        <div className="improve-header-actions">
          <button
            type="button"
            className="improve-top-action"
            onClick={() => setShowYearProgress((value) => !value)}
          >
            {showYearProgress ? 'Hide Year Progress' : 'Show Year Progress'}
          </button>
          <div className="improve-year-nav">
            <button type="button" onClick={() => setSelectedYear((year) => year - 1)} aria-label="Previous year">
              &larr;
            </button>
            <strong>{selectedYear}</strong>
            <button type="button" onClick={() => setSelectedYear((year) => year + 1)} aria-label="Next year">
              &rarr;
            </button>
          </div>
        </div>
      </div>

      {showYearProgress && (
        <section className="improve-heatmap-card">
          <div className="improve-card-header">
            <div>
              <h3>Year Progress</h3>
              <p>Each day deepens in purple based on how well you achieved that day&apos;s improvement goals.</p>
            </div>
            <div className="improve-heatmap-legend">
              <span>Less</span>
              {HEATMAP_COLORS.map((color) => (
                <span key={color} className="improve-legend-swatch" style={{ backgroundColor: color }} />
              ))}
              <span>More</span>
            </div>
          </div>

          <div className="improve-year-content">
            <div className="improve-heatmap-scroll">
              <div className="improve-heatmap-layout">
                <div
                  className="improve-month-labels"
                  style={{ gridTemplateColumns: `repeat(${totalHeatmapWeeks}, 13px)` }}
                >
                  {monthLabels.map((monthLabel) => (
                    <span
                      key={monthLabel.month}
                      style={{ gridColumn: `${monthLabel.column + 1} / span 1` }}
                    >
                      {monthLabel.label}
                    </span>
                  ))}
                </div>
                <div className="improve-heatmap-body">
                  <div className="improve-weekday-labels">
                    <span>Sun</span>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                  </div>
                  <div
                    className="improve-heatmap-grid"
                    style={{ gridTemplateColumns: `repeat(${totalHeatmapWeeks}, 13px)` }}
                  >
                    {heatmapCells.map((cell) => {
                      const slotIndexForDay = slots.findIndex((slot) => slot.days.some((day) => day.date === cell.date))
                      const buttonTitle = `${cell.date}: ${Math.round(cell.percentage * 100)}% achieved`
                      return (
                        <button
                          key={cell.date}
                          type="button"
                          className="improve-heatmap-cell"
                          style={{
                            backgroundColor: getHeatmapColor(cell.percentage),
                            gridColumn: cell.weekIndex + 1,
                            gridRow: cell.weekday + 1,
                          } as CSSProperties}
                          title={buttonTitle}
                          onClick={() => {
                            if (slotIndexForDay >= 0) {
                              setSelectedSlotIndex(slotIndexForDay)
                            }
                          }}
                        />
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <aside className="improve-rankings-panel">
              <div className="improve-rankings-header">
                <h4>Top Things To Improve</h4>
                <span>{yearRankings.length} tracked</span>
              </div>
              {visibleRankings.length === 0 ? (
                <p className="improve-rankings-empty">Start rating your 14-day slots and your strongest yearly themes will appear here.</p>
              ) : (
                <div className="improve-rankings-list">
                  {visibleRankings.map((ranking, index) => (
                    <div key={ranking.key} className="improve-ranking-item">
                      <div className="improve-ranking-order">{index + 1}</div>
                      <div className="improve-ranking-main">
                        <strong>{ranking.label}</strong>
                        <span>{ranking.fullCircles.toFixed(1)} full circles achieved this year</span>
                      </div>
                      <div className="improve-ranking-points">{ranking.totalPoints}/{MAX_RATING}+</div>
                    </div>
                  ))}
                </div>
              )}
              {yearRankings.length > 10 && (
                <button
                  type="button"
                  className="improve-show-more"
                  onClick={() => setShowAllRankings((value) => !value)}
                >
                  {showAllRankings ? 'Show less' : 'Show more'}
                </button>
              )}
            </aside>
          </div>
        </section>
      )}

      <section className="improve-slot-card">
        <div className="improve-card-header">
          <div>
            <h3>Current 14-Day Slot</h3>
            <p>{activeSlot.startDate} to {activeSlot.endDate}</p>
          </div>
          <div className="improve-slot-nav">
            <button
              type="button"
              onClick={() => setSelectedSlotIndex((index) => Math.max(0, index - 1))}
              disabled={selectedSlotIndex === 0}
            >
              Previous
            </button>
            <span>Slot {selectedSlotIndex + 1} of {slots.length}</span>
            <button
              type="button"
              onClick={() => setSelectedSlotIndex((index) => Math.min(slots.length - 1, index + 1))}
              disabled={selectedSlotIndex === slots.length - 1}
            >
              Next
            </button>
          </div>
        </div>

        <div className="improve-slot-summary">
          <div className="improve-summary-pill">
            <strong>{slotData.items.length}</strong>
            <span>things to improve</span>
          </div>
          <div className="improve-summary-pill">
            <strong>{slotProgressDays}/{activeSlot.days.length}</strong>
            <span>days with momentum</span>
          </div>
          <div className="improve-summary-pill">
            <strong>{totalPossibleScore === 0 ? 0 : Math.round((totalScore / totalPossibleScore) * 100)}%</strong>
            <span>slot achievement</span>
          </div>
        </div>

        <div className="improve-tracker-toolbar">
          <div className="improve-scroll-actions">
            <button type="button" className="improve-top-action improve-scroll-button" onClick={() => scrollTrackerBy('left')}>
              &larr; Earlier days
            </button>
            <button type="button" className="improve-top-action improve-scroll-button" onClick={() => scrollTrackerBy('right')}>
              Later days &rarr;
            </button>
            {currentDayIndex >= 0 && (
              <button type="button" className="improve-top-action improve-scroll-button" onClick={() => scrollToDay(currentDayIndex)}>
                Jump to today
              </button>
            )}
          </div>
          <div className="improve-day-rail">
            {activeSlot.days.map((day, index) => {
              const isToday = day.date === todayIso
              const scorePercent = Math.round(getDayCompletionPercentage(store, selectedYear, day.date, slots) * 100)
              return (
                <button
                  key={day.date}
                  type="button"
                  className={`improve-day-jump ${isToday ? 'current' : ''}`}
                  onClick={() => scrollToDay(index)}
                >
                  <strong>{day.shortLabel}</strong>
                  <span>{day.dayOfMonth}</span>
                  <small>{scorePercent}%</small>
                </button>
              )
            })}
          </div>
        </div>

        <div className="improve-tracker-scroll" ref={trackerScrollRef}>
          <div className="improve-tracker" style={trackerGridStyle}>
            <div className="improve-tracker-top-left">
              <span>What to improve</span>
              <div className="improve-slot-actions">
                <button type="button" onClick={addImproveItem}>Add improvement</button>
                <button type="button" onClick={copyPreviousSlotItems} disabled={!canCopyPrevious}>
                  Copy last 2 weeks
                </button>
              </div>
              <small>Each slot resets naturally, but you can carry over the last slot&apos;s focus items with one click.</small>
            </div>
            {activeSlot.days.map((day, index) => {
              const noteIsFilled = noteHasContent(yearData.notesByDay[day.date])
              const gratitudeIsFilled = noteHasContent(yearData.gratitudeByDay[day.date])
              const dayCompletion = Math.round(getDayCompletionPercentage(store, selectedYear, day.date, slots) * 100)

              return (
                <div
                  key={day.date}
                  className={`improve-day-header ${day.date === todayIso ? 'current' : ''}`}
                  ref={(element) => {
                    dayHeaderRefs.current[index] = element
                  }}
                >
                  <strong>{day.shortLabel}</strong>
                  <span>{day.dayOfMonth}</span>
                  <em>{day.label}</em>
                  <button
                    type="button"
                    className={`improve-note-button ${noteIsFilled ? 'has-note' : ''}`}
                    onClick={() => setActivePanel({ type: 'brainstorming', date: day.date })}
                  >
                    <span className="improve-note-icon" aria-hidden="true" />
                    Brainstorming
                  </button>
                  <button
                    type="button"
                    className={`improve-note-button improve-gratitude-button ${gratitudeIsFilled ? 'has-note' : ''}`}
                    onClick={() => setActivePanel({ type: 'gratitude', date: day.date })}
                  >
                    <span className="improve-gratitude-icon" aria-hidden="true">♥</span>
                    Gratitude
                  </button>
                  <small>{dayCompletion}%</small>
                </div>
              )
            })}

            {slotData.items.length === 0 && (
              <>
                <div className="improve-empty-state">
                  Add your first improvement for this slot, or copy over the last two weeks.
                </div>
                <div className="improve-empty-grid-fill" style={{ gridColumn: `2 / span ${activeSlot.days.length}` }} />
              </>
            )}

            {slotData.items.map((item) => (
              <RowFragment
                key={item.id}
                item={item}
                days={activeSlot.days}
                scores={slotData.scores}
                onTextChange={changeItemText}
                onRemove={removeItem}
                onRatingChange={changeRating}
              />
            ))}
          </div>
        </div>
      </section>

      {activePanel && (
        <div className="improve-modal-backdrop" onClick={() => setActivePanel(null)}>
          <div className="improve-modal" onClick={(event) => event.stopPropagation()}>
            <div className="improve-modal-header">
              <div>
                <h3>{activePanel.type === 'brainstorming' ? 'Brainstorming' : 'Gratitude'}</h3>
                <p>{activePanel.date}</p>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                aria-label={`Close ${activePanel.type}`}
              >
                Close
              </button>
            </div>
            <AutoGrowTextarea
              className="improve-note-textarea"
              placeholder={
                activePanel.type === 'brainstorming'
                  ? 'Write what you want to improve for this day...'
                  : 'Write what you are grateful for today, and be very specific.'
              }
              value={activePanelValue}
              onChange={(event) => {
                const nextValue = event.target.value
                updateYearData((currentYear) => ({
                  ...currentYear,
                  ...(activePanel.type === 'brainstorming'
                    ? {
                      notesByDay: {
                        ...currentYear.notesByDay,
                        [activePanel.date]: nextValue,
                      },
                    }
                    : {
                      gratitudeByDay: {
                        ...currentYear.gratitudeByDay,
                        [activePanel.date]: nextValue,
                      },
                    }),
                }))
              }}
            />
            {activePanel.type === 'gratitude' && (
              <p className="improve-modal-tip">Be very specific. Capture the exact person, moment, or detail you are grateful for today.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RowFragment({
  item,
  days,
  scores,
  onTextChange,
  onRemove,
  onRatingChange,
}: {
  item: ImproveItem
  days: DayInfo[]
  scores: Record<string, number>
  onTextChange: (itemId: string, nextText: string) => void
  onRemove: (itemId: string) => void
  onRatingChange: (date: string, itemId: string, rating: number) => void
}) {
  return (
    <>
      <div className="improve-item-cell">
        <AutoGrowTextarea
          className="improve-item-textarea"
          placeholder="Write the thing you want to improve..."
          value={item.text}
          onChange={(event) => onTextChange(item.id, event.target.value)}
        />
        <button
          type="button"
          className="improve-remove-row"
          onClick={() => onRemove(item.id)}
          aria-label="Remove improvement row"
        >
          Remove
        </button>
      </div>
      {days.map((day) => {
        const rating = scores[getScoreKey(day.date, item.id)] ?? 0
        return (
          <div key={`${item.id}-${day.date}`} className="improve-score-cell">
            <PartialCircle
              rating={rating}
              label={item.text || 'Improvement'}
              date={day.date}
              onChange={(nextRating) => onRatingChange(day.date, item.id, nextRating)}
            />
          </div>
        )
      })}
    </>
  )
}

function PartialCircle({
  rating,
  label,
  date,
  onChange,
}: {
  rating: number
  label: string
  date: string
  onChange: (rating: number) => void
}) {
  return (
    <div className="improve-circle-wrap">
      <svg viewBox="0 0 48 48" className="improve-score-circle" role="img" aria-label={`${label} on ${date}: ${rating} out of ${MAX_RATING}`}>
        <circle cx="24" cy="24" r="21" className="improve-circle-track" />
        {Array.from({ length: MAX_RATING }, (_, index) => {
          const value = index + 1
          const active = value <= rating
          return (
            <path
              key={value}
              d={describeRingSegment(index, MAX_RATING, 20, 10)}
              className={active ? 'improve-circle-segment active' : 'improve-circle-segment'}
              onClick={() => onChange(rating === value ? value - 1 : value)}
            />
          )
        })}
        <circle
          cx="24"
          cy="24"
          r="8"
          className="improve-circle-center"
          onClick={() => onChange(0)}
        />
        <text x="24" y="28" textAnchor="middle" className="improve-circle-text">
          {rating}
        </text>
      </svg>
      <span className="improve-circle-label">{rating}/5</span>
    </div>
  )
}
