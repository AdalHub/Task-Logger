import { type CSSProperties, useEffect, useState } from 'react'
import './Courses.css'

type ScheduleCategory =
  | 'admin'
  | 'deep-study'
  | 'applications'
  | 'dad-session'
  | 'mock'
  | 'review'
  | 'prep'
  | 'rest'
  | 'full-rest'

interface ScheduleEntry {
  category: ScheduleCategory
  title: string
  details: string
  start: string | null
  end: string | null
  allDay?: boolean
}

interface ScheduleDay {
  date: string
  entries: ScheduleEntry[]
}

interface ScheduleWeek {
  weekNumber: number
  phase: string
  title: string
  goal: string
  effort: string
  target: string
  notes?: string[]
  days: ScheduleDay[]
}

const CALENDAR_START_HOUR = 8
const CALENDAR_END_HOUR = 17
const HALF_HOUR_HEIGHT = 26
const COMPLETION_STORAGE_KEY = 'task-logger-courses-completed'

const CATEGORY_STYLES: Record<ScheduleCategory, { label: string; color: string }> = {
  admin: { label: 'Admin', color: '#c27c0e' },
  'deep-study': { label: 'Deep Study', color: '#5b5bd6' },
  applications: { label: 'Applications', color: '#1f9d55' },
  'dad-session': { label: 'Dad Session', color: '#d9485f' },
  mock: { label: 'Mock', color: '#0f7aa6' },
  review: { label: 'Review', color: '#64748b' },
  prep: { label: 'Prep', color: '#0f766e' },
  rest: { label: 'Rest', color: '#9a6b38' },
  'full-rest': { label: 'Full Rest', color: '#6b7280' },
}

function utcDate(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day))
}

function addUtcDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + amount)
  return next
}

function formatIsoDate(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatWeekRange(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return `${formatter.format(new Date(`${startDate}T00:00:00Z`))} - ${formatter.format(new Date(`${endDate}T00:00:00Z`))}`
}

function getTodayIsoDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function entry(
  start: string,
  end: string,
  category: ScheduleCategory,
  title: string,
  details: string,
): ScheduleEntry {
  return { start, end, category, title, details }
}

function allDayEntry(category: ScheduleCategory, title: string, details: string): ScheduleEntry {
  return { start: null, end: null, category, title, details, allDay: true }
}

function buildWeek(
  weekNumber: number,
  phase: string,
  title: string,
  goal: string,
  effort: string,
  target: string,
  notes: string[] | undefined,
  daysEntries: ScheduleEntry[][],
): ScheduleWeek {
  const start = addUtcDays(utcDate(2026, 4, 25), (weekNumber - 1) * 7)
  const days = daysEntries.map((entries, dayIndex) => ({
    date: formatIsoDate(addUtcDays(start, dayIndex)),
    entries,
  }))
  return { weekNumber, phase, title, goal, effort, target, notes, days }
}

function buildWeeksFourAndFive(weekNumber: number): ScheduleWeek {
  const storyNumberBase = weekNumber === 4 ? 1 : 5
  const systemDesignPrompts = [
    'RAG chatbot for enterprise',
    'URL shortener',
    'Notification system',
    'Job application tracker',
  ]

  const weekdayDay = (offset: number): ScheduleEntry[] => [
    entry(
      '09:00',
      '10:30',
      'mock',
      '2 Neetcode mediums',
      'Cold and timed. No looking at solutions first, and explain your reasoning out loud every time.',
    ),
    entry(
      '11:00',
      '12:00',
      'mock',
      `System design: ${systemDesignPrompts[offset]}`,
      'Use the same structure every time: clarify, estimate, high-level design, deep dive, then tradeoffs.',
    ),
    entry(
      '13:00',
      '14:00',
      'deep-study',
      `STAR story #${storyNumberBase + offset}`,
      'Write and rehearse one behavioral story. Aim for a crisp two-minute version with clear impact and tradeoffs.',
    ),
    entry(
      '15:00',
      '16:00',
      'applications',
      'Targeted applications',
      'Send 3 tailored applications and align your resume bullets to the job description.',
    ),
  ]

  const wednesday = [
    entry(
      '09:00',
      '10:30',
      'mock',
      '2 Neetcode mediums',
      'Cold and timed. No looking at solutions first, and explain your reasoning out loud every time.',
    ),
    entry(
      '11:00',
      '12:00',
      'mock',
      `System design: ${systemDesignPrompts[2]}`,
      'Use the same structure every time: clarify, estimate, high-level design, deep dive, then tradeoffs.',
    ),
    entry(
      '13:00',
      '14:30',
      'dad-session',
      'Full end-to-end mock',
      'Non-negotiable weekly CTO-style mock. Treat it like a real interview from start to finish.',
    ),
    entry(
      '14:30',
      '15:30',
      'deep-study',
      `STAR story #${storyNumberBase + 2}`,
      "Polish the day's behavioral story after the mock so the feedback is still fresh.",
    ),
    entry(
      '15:30',
      '16:30',
      'applications',
      'Targeted applications',
      'Send 3 tailored applications and track follow-ups in your spreadsheet.',
    ),
  ]

  const saturdayTarget = weekNumber === 4
    ? 'Keep the pipeline moving toward 40+ total applications.'
    : 'Reach 50+ total applications by the end of week 5.'

  return buildWeek(
    weekNumber,
    'Phase 2',
    `Mock Sprints + Behavioral Polish (Week ${weekNumber})`,
    'Make the interview feel like the tenth rep, not the first.',
    '2 hrs study + 2 hrs mock + 1 hr apply',
    saturdayTarget,
    [
      'Wednesday was specified as an add-on dad session. To keep every Wednesday task visible without collisions, the STAR-story block shifts to 2:30-3:30pm and applications to 3:30-4:30pm.',
      'Rotate STAR stories toward these themes by the end of week 5: biggest challenge, mistake, led without authority, delivered under pressure, disagreed technically, built for real users, self-directed project, and why AI/ML.',
    ],
    [
      weekdayDay(0),
      weekdayDay(1),
      wednesday,
      weekdayDay(3),
      [
        entry(
          '09:00',
          '11:30',
          'mock',
          'Full mock interview',
          'Recorded session: 45 minutes coding, 30 minutes system design, 20 minutes behavioral, with no breaks.',
        ),
        entry(
          '12:00',
          '13:00',
          'mock',
          'Debrief',
          'Identify one specific fix for next week. One issue only, not a giant backlog.',
        ),
      ],
      [
        entry(
          '10:00',
          '12:00',
          'applications',
          'Application sprint',
          saturdayTarget,
        ),
        entry(
          '13:00',
          '17:00',
          'rest',
          'Game dev or rest',
          'Protect recovery time so the mock intensity stays sustainable.',
        ),
      ],
      [
        allDayEntry(
          'full-rest',
          'Full rest',
          'No studying today. Let the reps consolidate.',
        ),
      ],
    ],
  )
}

function buildWeeksSixToEight(weekNumber: number): ScheduleWeek {
  const saturdayTarget = weekNumber === 6
    ? 'Push toward 60+ total applications.'
    : weekNumber === 7
      ? 'Keep the pipeline warm while interviews begin landing.'
      : 'Reach 60-80 total applications by the end of week 8.'

  return buildWeek(
    weekNumber,
    'Phase 3',
    `Simulation Mode (Week ${weekNumber})`,
    'Real interviews should be arriving. Keep simulating and keep the pipeline full.',
    '1 hr review + 2 hrs mock + 1.5 hrs apply',
    saturdayTarget,
    [
      'If a real interview lands this week, company-specific prep replaces the study block for that day.',
      'The internship referral is the override path: if it gets traction, stop the rest of the schedule and spend the day on company-specific prep.',
    ],
    [
      [
        entry(
          '09:00',
          '10:30',
          'mock',
          '2 Neetcode problems',
          'Work only on previous weak spots. This is not the time to grind brand-new patterns.',
        ),
        entry(
          '11:00',
          '12:00',
          'review',
          'Technical refresh',
          'Refresh one technical topic for 30-60 minutes. Review, do not relearn.',
        ),
        entry(
          '13:00',
          '14:30',
          'applications',
          'Applications + warm outreach',
          'Send applications and follow up with people you already have some connection with.',
        ),
      ],
      [
        entry(
          '09:00',
          '10:00',
          'mock',
          'System design rehearsal',
          'Out loud from start to finish. Treat every rep like a real interview.',
        ),
        entry(
          '10:30',
          '12:00',
          'applications',
          'Personalized outreach',
          'Message people at target companies with a short note tied to a relevant project you built.',
        ),
        entry(
          '13:00',
          '14:00',
          'prep',
          'Company-specific prep',
          'For any interview this week: study the stack, recent product news, why you fit, and 3 research-backed questions.',
        ),
      ],
      [
        entry(
          '11:00',
          '12:30',
          'dad-session',
          'Weekly mock',
          'Non-negotiable weekly dad session. Keep this running until you have an offer.',
        ),
      ],
      [
        entry(
          '09:00',
          '10:00',
          'mock',
          'Coding problem rehearsal',
          'Out loud from start to finish. Treat every rep like a real interview.',
        ),
        entry(
          '10:30',
          '12:00',
          'applications',
          'Personalized outreach',
          'Message people at target companies with a short note tied to a relevant project you built.',
        ),
        entry(
          '13:00',
          '14:00',
          'prep',
          'Company-specific prep',
          'For any interview this week: study the stack, recent product news, why you fit, and 3 research-backed questions.',
        ),
      ],
      [
        entry(
          '09:00',
          '11:00',
          'mock',
          'Full end-to-end mock',
          'Technical, system design, and behavioral back to back with no notes.',
        ),
        entry(
          '12:00',
          '17:00',
          'rest',
          'Hard stop + afternoon rest',
          'Stop at noon and recover for the weekend.',
        ),
      ],
      [
        entry(
          '10:00',
          '12:00',
          'applications',
          'Application sprint',
          saturdayTarget,
        ),
        entry(
          '13:00',
          '17:00',
          'rest',
          'Game dev or rest',
          'Keep the afternoon guilt-free so you can reset before the next week.',
        ),
      ],
      [
        allDayEntry(
          'full-rest',
          'Full rest',
          'No studying today. Rest is part of the plan.',
        ),
      ],
    ],
  )
}

function buildScheduleWeeks(): ScheduleWeek[] {
  return [
    buildWeek(
      1,
      'Phase 1',
      'Resume Ownership: RAG, LLM Agents, Async Python',
      'Speak to every resume bullet for 3+ minutes with specific tradeoffs.',
      '4-5 hrs study + 1 hr apply',
      'Reach 10+ total applications by the end of week 1.',
      [
        'Day 1 includes the resume date fix before the main study block and a spreadsheet setup block at the end of the afternoon.',
        'Target roles: Junior AI/ML Engineer, AI Software Engineer, and Python Backend Developer.',
      ],
      [
        [
          entry(
            '08:30',
            '09:00',
            'admin',
            'Fix Ohel resume end date',
            'Use Jan 2025 as the end date and make both resume versions consistent. This removes a credibility red flag fast.',
          ),
          entry(
            '09:00',
            '11:30',
            'deep-study',
            'RAG fundamentals from scratch',
            'Build a toy RAG without LangChain. Focus on chunking strategies, chunk-size tradeoffs, overlap, and retrieval scoring.',
          ),
          entry(
            '12:30',
            '14:30',
            'deep-study',
            'Vector DBs: FAISS vs Chroma vs Pinecone',
            'Cover when to use each, cosine similarity math, and embedding tradeoffs such as ada-002 vs sentence-transformers.',
          ),
          entry(
            '15:00',
            '16:00',
            'applications',
            'Targeted applications',
            'Send 3-4 targeted applications for junior AI/ML or AI software roles only.',
          ),
          entry(
            '16:00',
            '16:30',
            'admin',
            'Set up application tracker',
            'Create the spreadsheet with date sent, company, role, referral, status, follow-up date, and notes.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:30',
            'deep-study',
            'LLM agent patterns',
            'Study ReAct, tool calling, and fine-tuning vs RAG tradeoffs until you can explain the choice cold.',
          ),
          entry(
            '12:30',
            '14:30',
            'deep-study',
            'Prompt engineering depth',
            'Cover system prompts, few-shot prompting, chain-of-thought, and structured JSON outputs with a focus on why each exists.',
          ),
          entry(
            '15:00',
            '16:00',
            'applications',
            'Applications + LinkedIn outreach',
            'Send 3-4 applications plus 2 warm messages asking for a quick team chat, not a job ask.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:00',
            'deep-study',
            'Write the why for every Ohel bullet',
            'For each resume bullet, write why you chose the tool, what broke, how you fixed it, and what you would change now.',
          ),
          entry(
            '11:30',
            '13:00',
            'dad-session',
            'Mock: Ohel deep dive',
            'Walk through the RAG pipeline in full depth and defend every decision under pushback.',
          ),
          entry(
            '14:00',
            '15:00',
            'applications',
            'Follow-ups',
            'Follow up on any application that is past day 10 with no response.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:30',
            'deep-study',
            'Async Python deep dive',
            'Study the event loop, coroutines, tasks, gather vs wait, and asyncio vs threading vs multiprocessing from understanding.',
          ),
          entry(
            '12:30',
            '14:30',
            'deep-study',
            'Build FastAPI + async endpoints',
            'Create a small demo using FastAPI and Pydantic, then practice explaining why you chose the stack.',
          ),
          entry(
            '15:00',
            '16:00',
            'applications',
            'Targeted applications',
            'Send 3-4 targeted applications and log every one in the tracker.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:00',
            'deep-study',
            'GCP depth',
            'Cover App Engine vs Cloud Run vs GCS, autoscaling behavior, how your chatbot used it, and cost tradeoffs.',
          ),
          entry(
            '11:30',
            '13:00',
            'deep-study',
            'ElasticSearch fundamentals',
            'Focus on inverted indexes, query DSL, relevance scoring, and why search belongs there instead of SQL.',
          ),
          entry(
            '14:00',
            '15:30',
            'mock',
            'Record Ohel answers',
            'Record yourself answering Ohel questions, then watch for vagueness, hesitations, and weak explanations.',
          ),
        ],
        [
          entry(
            '10:00',
            '13:00',
            'applications',
            'Application sprint',
            'Send 6-8 applications so you finish week 1 with 10+ total applications out.',
          ),
          entry(
            '13:00',
            '17:00',
            'rest',
            'Game dev or full rest',
            'Afternoon recovery is intentional and guilt-free.',
          ),
        ],
        [
          allDayEntry(
            'full-rest',
            'Full rest',
            'No studying today. Your brain needs consolidation time.',
          ),
        ],
      ],
    ),
    buildWeek(
      2,
      'Phase 1',
      'Resume Ownership: ML Fundamentals + Resume Mastery',
      'Own every resume bullet while tightening ML fundamentals.',
      '4-5 hrs study + 1 hr apply',
      'Reach 20+ total applications by the end of week 2.',
      undefined,
      [
        [
          entry(
            '09:00',
            '11:30',
            'deep-study',
            'Supervised learning cold',
            'Explain gradient descent, loss functions, and bias-variance tradeoffs out loud from intuition.',
          ),
          entry(
            '12:30',
            '14:30',
            'deep-study',
            'Classification models',
            'Study decision trees, random forests, XGBoost, and when metrics like precision, recall, F1, and AUC-ROC matter.',
          ),
          entry(
            '15:00',
            '16:00',
            'applications',
            'Targeted applications',
            'Send 3-4 targeted applications.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:30',
            'deep-study',
            'Neural nets + transformers',
            'Cover forward pass, backprop intuition, and transformer attention conceptually so you can explain it simply.',
          ),
          entry(
            '12:30',
            '14:00',
            'deep-study',
            'scikit-learn end to end',
            'Build a real classifier: load, preprocess, train, evaluate, and tune while explaining each decision.',
          ),
          entry(
            '15:00',
            '16:00',
            'applications',
            'Applications + LinkedIn outreach',
            'Send applications plus 2 outreach messages to people at target companies.',
          ),
        ],
        [
          entry(
            '10:00',
            '11:30',
            'dad-session',
            'Mock: ML conceptual questions',
            'Defend answers to fine-tuning vs RAG, XGBoost vs neural nets, and explaining attention to a PM.',
          ),
          entry(
            '12:30',
            '14:30',
            'deep-study',
            'Data pipelines + MLOps basics',
            'Practice pandas groupby, merge, reshape, plus model versioning, experiment tracking, and production serving basics.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:00',
            'deep-study',
            'System design foundations',
            'Study scalability, latency vs throughput, Redis caching, load balancing, REST endpoints, pagination, and status codes.',
          ),
          entry(
            '11:30',
            '13:30',
            'deep-study',
            'Design an enterprise RAG chatbot',
            'Practice clarify, estimate, high-level design, deep dive, and tradeoffs for a likely target-role question.',
          ),
          entry(
            '14:30',
            '15:30',
            'applications',
            'Targeted applications',
            'Send 3-4 more targeted applications.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:00',
            'mock',
            'Full mock interview',
            'Recorded block: one timed Neetcode medium, one RAG chatbot system design, and one behavioral story.',
          ),
          entry(
            '11:30',
            '12:30',
            'mock',
            'Debrief',
            'Review the recording and write down the 3 weakest moments to drive next week.',
          ),
        ],
        [
          entry(
            '10:00',
            '13:00',
            'applications',
            'Application sprint',
            'Send 6-8 applications and finish week 2 with 20+ total submissions.',
          ),
          entry(
            '13:00',
            '17:00',
            'rest',
            'Game dev or rest',
            'Use the afternoon to recover and keep the pace sustainable.',
          ),
        ],
        [
          allDayEntry(
            'full-rest',
            'Full rest',
            'No studying today.',
          ),
        ],
      ],
    ),
    buildWeek(
      3,
      'Phase 2',
      'Fill the Gaps from Your Week 2 Debrief',
      'Study the weak spots, not the comfortable topics.',
      '3-4 hrs study + 1.5 hrs mock + 1 hr apply',
      'Reach 30+ total applications by the end of week 3.',
      [
        'The Monday, Tuesday, and Wednesday study blocks are deliberately named after your three weakest moments from the week 2 recording.',
      ],
      [
        [
          entry(
            '09:00',
            '11:30',
            'deep-study',
            'Weakest gap from debrief #1',
            'Be specific. If you blanked on attention or stumbled on system design, drill that exact weakness.',
          ),
          entry(
            '12:30',
            '14:00',
            'mock',
            '2 Neetcode mediums',
            'Timed, with a full verbal explanation after each one as if the interviewer were watching.',
          ),
          entry(
            '15:00',
            '16:00',
            'applications',
            'Targeted applications',
            'Send 3 targeted applications.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:30',
            'deep-study',
            'Weakest gap from debrief #2',
            'Stay focused on the exact weak area instead of broad review.',
          ),
          entry(
            '12:30',
            '14:00',
            'mock',
            '2 Neetcode mediums',
            'Timed practice with emphasis on trees, then graphs, then dynamic programming.',
          ),
          entry(
            '15:00',
            '16:00',
            'applications',
            'Applications + LinkedIn outreach',
            'Send 3 applications and do one round of outreach.',
          ),
        ],
        [
          entry(
            '10:00',
            '11:30',
            'dad-session',
            'Full technical screen',
            'Architecture question, one coding problem, and behavioral questions with no hints.',
          ),
          entry(
            '12:30',
            '14:00',
            'deep-study',
            'Weakest gap from debrief #3',
            'Use the feedback from the mock to sharpen the last big weak spot.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:00',
            'mock',
            '2 Neetcode mediums',
            'Timed practice with live-style verbal explanations.',
          ),
          entry(
            '11:30',
            '13:00',
            'deep-study',
            'STAR story #1',
            'Write and rehearse the biggest technical challenge you faced at Ohel in a tight two-minute version.',
          ),
          entry(
            '14:00',
            '15:00',
            'applications',
            'Applications + follow-ups',
            'Keep the pipeline moving and follow up where needed.',
          ),
        ],
        [
          entry(
            '09:00',
            '11:00',
            'mock',
            '2 Neetcode mediums',
            'Timed practice with live-style verbal explanations.',
          ),
          entry(
            '11:30',
            '13:00',
            'deep-study',
            'STAR story #2',
            'Write and rehearse a mistake you made and what you learned from it.',
          ),
          entry(
            '14:00',
            '15:00',
            'applications',
            'Applications + follow-ups',
            'Keep the pipeline moving and follow up where needed.',
          ),
        ],
        [
          entry(
            '10:00',
            '12:00',
            'applications',
            'Application sprint',
            'Push to 30+ total applications by the end of week 3.',
          ),
          entry(
            '13:00',
            '17:00',
            'rest',
            'Game dev or rest',
            'Reset before the next mock-heavy stretch.',
          ),
        ],
        [
          allDayEntry(
            'full-rest',
            'Full rest',
            'No studying today.',
          ),
        ],
      ],
    ),
    buildWeeksFourAndFive(4),
    buildWeeksFourAndFive(5),
    buildWeeksSixToEight(6),
    buildWeeksSixToEight(7),
    buildWeeksSixToEight(8),
  ]
}

const SCHEDULE_WEEKS = buildScheduleWeeks()
const TODAY_ISO_DATE = getTodayIsoDate()

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToDisplay(value: string): string {
  const [hoursText, minutesText] = value.split(':')
  const hours = Number(hoursText)
  const minutes = Number(minutesText)
  const suffix = hours >= 12 ? 'pm' : 'am'
  const normalized = hours % 12 || 12
  if (minutes === 0) return `${normalized}${suffix}`
  return `${normalized}:${String(minutes).padStart(2, '0')}${suffix}`
}

function formatEntryTime(entryItem: ScheduleEntry): string {
  if (entryItem.allDay || !entryItem.start || !entryItem.end) return 'All day'
  return `${minutesToDisplay(entryItem.start)} - ${minutesToDisplay(entryItem.end)}`
}

function getEntryKey(date: string, entryItem: ScheduleEntry): string {
  return [date, entryItem.start ?? 'all-day', entryItem.end ?? 'all-day', entryItem.title].join('::')
}

function getWeekIndexForDate(date: string): number {
  const matchingIndex = SCHEDULE_WEEKS.findIndex((week) =>
    week.days.some((day) => day.date === date),
  )
  return matchingIndex >= 0 ? matchingIndex : 0
}

function getDefaultSelectedDate(weekIndex: number): string {
  const currentWeek = SCHEDULE_WEEKS[weekIndex]
  const todayInWeek = currentWeek.days.find((day) => day.date === TODAY_ISO_DATE)
  return todayInWeek?.date ?? currentWeek.days[0].date
}

export default function Courses() {
  const [activeWeekIndex, setActiveWeekIndex] = useState(() => getWeekIndexForDate(TODAY_ISO_DATE))
  const [selectedDate, setSelectedDate] = useState(() => getDefaultSelectedDate(getWeekIndexForDate(TODAY_ISO_DATE)))
  const [completedEntries, setCompletedEntries] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      const storedValue = window.localStorage.getItem(COMPLETION_STORAGE_KEY)
      if (!storedValue) return {}
      const parsed = JSON.parse(storedValue)
      return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, boolean> : {}
    } catch {
      return {}
    }
  })

  useEffect(() => {
    setSelectedDate(getDefaultSelectedDate(activeWeekIndex))
  }, [activeWeekIndex])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(COMPLETION_STORAGE_KEY, JSON.stringify(completedEntries))
  }, [completedEntries])

  const activeWeek = SCHEDULE_WEEKS[activeWeekIndex]
  const selectedDay = activeWeek.days.find((day) => day.date === selectedDate) ?? activeWeek.days[0]
  const pendingEntries = selectedDay.entries.filter((item) => !completedEntries[getEntryKey(selectedDay.date, item)])
  const completedDayEntries = selectedDay.entries.filter((item) => completedEntries[getEntryKey(selectedDay.date, item)])
  const totalMinutes = (CALENDAR_END_HOUR - CALENDAR_START_HOUR) * 60
  const timelineHeight = (totalMinutes / 30) * HALF_HOUR_HEIGHT
  const hourLabels = Array.from(
    { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
    (_, index) => CALENDAR_START_HOUR + index,
  )

  return (
    <div className="courses">
      <div className="courses-intro">
        <div>
          <h2>Courses Schedule</h2>
          <p>
            8-week interview ramp from Monday, May 25, 2026 through Sunday, July 19, 2026.
            The weekly dad session stays locked in every Wednesday.
          </p>
        </div>
        <div className="courses-meta">
          <span>Target roles: Junior AI/ML Engineer, AI Software Engineer, Python Backend Developer</span>
          <span>Only apply to AI/ML, AI software, AI automation, LLM app, Python backend, or full-stack AI roles</span>
        </div>
      </div>

      <div className="courses-legend">
        {Object.entries(CATEGORY_STYLES).map(([key, style]) => (
          <div key={key} className="courses-legend-item">
            <span className="courses-legend-swatch" style={{ backgroundColor: style.color }} />
            <span>{style.label}</span>
          </div>
        ))}
      </div>

      <div className="courses-week-strip">
        {SCHEDULE_WEEKS.map((week, index) => (
          <button
            key={week.weekNumber}
            type="button"
            className={index === activeWeekIndex ? 'active' : ''}
            onClick={() => setActiveWeekIndex(index)}
          >
            <span>Week {week.weekNumber}</span>
            <span>{formatWeekRange(week.days[0].date, week.days[6].date)}</span>
          </button>
        ))}
      </div>

      <div className="courses-week-summary">
        <div className="courses-summary-card">
          <span className="courses-summary-label">{activeWeek.phase}</span>
          <strong>{activeWeek.title}</strong>
          <p>{activeWeek.goal}</p>
        </div>
        <div className="courses-summary-card">
          <span className="courses-summary-label">Daily target</span>
          <strong>{activeWeek.effort}</strong>
          <p>{activeWeek.target}</p>
        </div>
        {activeWeek.notes && (
          <div className="courses-summary-card">
            <span className="courses-summary-label">Notes</span>
            {activeWeek.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
          </div>
        )}
      </div>

      <div className="courses-calendar-shell">
        <div className="courses-calendar">
          <div className="courses-time-rail">
            <div className="courses-time-header">Hours</div>
            <div className="courses-time-labels" style={{ height: timelineHeight }}>
              {hourLabels.map((hour) => (
                <div
                  key={hour}
                  className="courses-time-label"
                  style={{ top: (hour - CALENDAR_START_HOUR) * HALF_HOUR_HEIGHT * 2 }}
                >
                  {minutesToDisplay(`${String(hour).padStart(2, '0')}:00`)}
                </div>
              ))}
            </div>
          </div>

          <div className="courses-days">
            {activeWeek.days.map((day) => {
              const allDayEntries = day.entries.filter((item) => item.allDay)
              const timedEntries = day.entries.filter((item) => item.start && item.end)
              const isSelected = day.date === selectedDay.date
              const completedCount = day.entries.filter((item) => completedEntries[getEntryKey(day.date, item)]).length

              return (
                <button
                  key={day.date}
                  type="button"
                  className={`courses-day-column ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  <div className="courses-day-header">
                    <span>{formatDayLabel(day.date).split(',')[0]}</span>
                    <strong>{new Date(`${day.date}T00:00:00Z`).getUTCDate()}</strong>
                    <small>{completedCount}/{day.entries.length} done</small>
                  </div>

                  <div className="courses-all-day-row">
                    {allDayEntries.length === 0 ? (
                      <span className="courses-all-day-empty">Open</span>
                    ) : (
                      allDayEntries.map((item) => (
                        <div
                          key={`${day.date}-${item.title}`}
                          className="courses-all-day-chip"
                          style={{ '--category-color': CATEGORY_STYLES[item.category].color } as CSSProperties}
                        >
                          {item.title}
                        </div>
                      ))
                    )}
                  </div>

                  <div className="courses-day-timeline" style={{ height: timelineHeight }}>
                    {timedEntries.map((item) => {
                      const startMinutes = timeToMinutes(item.start ?? '00:00') - CALENDAR_START_HOUR * 60
                      const endMinutes = timeToMinutes(item.end ?? '00:00') - CALENDAR_START_HOUR * 60
                      const top = (startMinutes / 30) * HALF_HOUR_HEIGHT
                      const height = ((endMinutes - startMinutes) / 30) * HALF_HOUR_HEIGHT

                      return (
                        <div
                          key={`${day.date}-${item.title}-${item.start}`}
                          className="courses-event-block"
                          style={{
                            top,
                            height,
                            '--category-color': CATEGORY_STYLES[item.category].color,
                          } as CSSProperties}
                        >
                          <span className="courses-event-time">{formatEntryTime(item)}</span>
                          <strong>{item.title}</strong>
                          <span>{CATEGORY_STYLES[item.category].label}</span>
                        </div>
                      )
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="courses-day-detail">
        <div className="courses-day-detail-header">
          <div>
            <h3>{formatDayLabel(selectedDay.date)}</h3>
            <p>{selectedDay.date}</p>
          </div>
          <div className="courses-day-progress">
            <strong>{completedDayEntries.length}/{selectedDay.entries.length}</strong>
            <span>{selectedDay.date === TODAY_ISO_DATE ? 'completed today' : 'completed'}</span>
          </div>
        </div>
        <div className="courses-agenda-section">
          <div className="courses-agenda-section-header">
            <h4>{selectedDay.date === TODAY_ISO_DATE ? 'Everything to do today' : 'To do'}</h4>
            <span>{pendingEntries.length} remaining</span>
          </div>
          <div className="courses-day-agenda">
            {pendingEntries.length === 0 ? (
              <p className="courses-agenda-empty">Everything for this day is completed.</p>
            ) : (
              pendingEntries.map((item) => {
                const entryKey = getEntryKey(selectedDay.date, item)
                return (
                  <label
                    key={entryKey}
                    className="courses-agenda-item"
                    style={{ '--category-color': CATEGORY_STYLES[item.category].color } as CSSProperties}
                  >
                    <div className="courses-agenda-check">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => {
                          setCompletedEntries((current) => ({
                            ...current,
                            [entryKey]: true,
                          }))
                        }}
                        aria-label={`Mark ${item.title} as completed`}
                      />
                    </div>
                    <div className="courses-agenda-time">{formatEntryTime(item)}</div>
                    <div className="courses-agenda-body">
                      <div className="courses-agenda-topline">
                        <strong>{item.title}</strong>
                        <span>{CATEGORY_STYLES[item.category].label}</span>
                      </div>
                      <p>{item.details}</p>
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>
        <div className="courses-agenda-section">
          <div className="courses-agenda-section-header">
            <h4>Completed</h4>
            <span>{completedDayEntries.length} done</span>
          </div>
          <div className="courses-day-agenda">
            {completedDayEntries.length === 0 ? (
              <p className="courses-agenda-empty">Completed tasks will show up here after you check them off.</p>
            ) : (
              completedDayEntries.map((item) => {
                const entryKey = getEntryKey(selectedDay.date, item)
                return (
                  <label
                    key={entryKey}
                    className="courses-agenda-item courses-agenda-item-completed"
                    style={{ '--category-color': CATEGORY_STYLES[item.category].color } as CSSProperties}
                  >
                    <div className="courses-agenda-check">
                      <input
                        type="checkbox"
                        checked
                        onChange={() => {
                          setCompletedEntries((current) => {
                            const next = { ...current }
                            delete next[entryKey]
                            return next
                          })
                        }}
                        aria-label={`Mark ${item.title} as not completed`}
                      />
                    </div>
                    <div className="courses-agenda-time">{formatEntryTime(item)}</div>
                    <div className="courses-agenda-body">
                      <div className="courses-agenda-topline">
                        <strong>{item.title}</strong>
                        <span>{CATEGORY_STYLES[item.category].label}</span>
                      </div>
                      <p>{item.details}</p>
                    </div>
                  </label>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
