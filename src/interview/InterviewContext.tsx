import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  PropsWithChildren,
  ReactElement,
  useMemo
} from 'react'
import { useSelector } from 'ustaxes/redux'
import { TaxesState } from 'ustaxes/redux'
import { Information } from 'ustaxes/core/data'
import { InterviewSection, InterviewNode, InterviewStatus } from './types'
import {
  startInterview,
  advanceInterview,
  goBackInterview,
  answerAndAdvance,
  jumpToSection,
  completeInterview,
  currentSection as getCurrentSection,
  currentNode as getCurrentNode,
  sectionProgress,
  overallProgress
} from './InterviewEngine'
import { buildQuestionGraph } from './questionGraph'

/**
 * All state is unified in a single reducer to avoid stale-closure bugs.
 * The answers dict lives alongside the interview progress so that
 * answerAndAdvance can atomically record an answer and advance.
 */
interface UnifiedState {
  answers: Record<string, boolean>
  sectionIndex: number
  nodeIndex: number
  completedNodes: Set<string>
  skippedNodes: Set<string>
  status: InterviewStatus
}

type Action =
  | { type: 'START'; sections: InterviewSection[] }
  | { type: 'ADVANCE'; sections: InterviewSection[] }
  | { type: 'GO_BACK'; sections: InterviewSection[] }
  | {
      type: 'ANSWER_AND_ADVANCE'
      nodeId: string
      answer: boolean
      info: Information
    }
  | {
      type: 'JUMP_TO_SECTION'
      sectionIndex: number
      sections: InterviewSection[]
    }
  | { type: 'FINISH'; sections: InterviewSection[] }

/**
 * Build an InterviewState from unified state + current sections.
 * This is the bridge between our unified reducer and the engine functions.
 */
const toInterviewState = (us: UnifiedState, sections: InterviewSection[]) => ({
  status: us.status,
  sections,
  progress: {
    currentSectionIndex: us.sectionIndex,
    currentNodeIndex: us.nodeIndex,
    completedNodes: us.completedNodes,
    skippedNodes: us.skippedNodes,
    answers: us.answers
  }
})

const fromInterviewState = (
  is: ReturnType<typeof toInterviewState>,
  answers: Record<string, boolean>
): UnifiedState => ({
  answers,
  sectionIndex: is.progress.currentSectionIndex,
  nodeIndex: is.progress.currentNodeIndex,
  completedNodes: is.progress.completedNodes,
  skippedNodes: is.progress.skippedNodes,
  status: is.status
})

const initialUnifiedState: UnifiedState = {
  answers: {},
  sectionIndex: 0,
  nodeIndex: 0,
  completedNodes: new Set(),
  skippedNodes: new Set(),
  status: 'not_started'
}

function reducer(state: UnifiedState, action: Action): UnifiedState {
  switch (action.type) {
    case 'START': {
      const is = toInterviewState(state, action.sections)
      const result = startInterview(is)
      return fromInterviewState(result, state.answers)
    }
    case 'ADVANCE': {
      const is = toInterviewState(state, action.sections)
      const result = advanceInterview(is)
      return fromInterviewState(result, state.answers)
    }
    case 'GO_BACK': {
      const is = toInterviewState(state, action.sections)
      const result = goBackInterview(is)
      return fromInterviewState(result, state.answers)
    }
    case 'ANSWER_AND_ADVANCE': {
      // Atomic: record answer, rebuild sections with fresh closures, advance
      const newAnswers = { ...state.answers, [action.nodeId]: action.answer }
      // Rebuild sections so shouldShow closures capture the NEW answers
      const freshSections = buildQuestionGraph(action.info, newAnswers)
      const freshIs = toInterviewState(
        { ...state, answers: newAnswers },
        freshSections
      )
      const result = answerAndAdvance(freshIs, action.nodeId, action.answer)
      return fromInterviewState(result, newAnswers)
    }
    case 'JUMP_TO_SECTION': {
      const is = toInterviewState(state, action.sections)
      const result = jumpToSection(is, action.sectionIndex)
      return fromInterviewState(result, state.answers)
    }
    case 'FINISH': {
      const is = toInterviewState(state, action.sections)
      const result = completeInterview(is)
      return fromInterviewState(result, state.answers)
    }
    default:
      return state
  }
}

interface InterviewContextValue {
  sections: InterviewSection[]
  status: InterviewStatus
  currentSection: InterviewSection | undefined
  currentNode: InterviewNode | undefined
  progress: number
  sectionProgressValues: number[]
  sectionIndex: number

  start: () => void
  advance: () => void
  goBack: () => void
  answerQuestion: (nodeId: string, answer: boolean) => void
  goToSection: (sectionIndex: number) => void
  finish: () => void
}

const InterviewCtx = createContext<InterviewContextValue | null>(null)

export const InterviewProvider = ({
  children
}: PropsWithChildren<Record<string, unknown>>): ReactElement => {
  const info = useSelector((s: TaxesState) => s.information)
  const [state, dispatch] = useReducer(reducer, initialUnifiedState)

  // Build sections from current answers so shouldShow closures are up-to-date
  const sections = useMemo(
    () => buildQuestionGraph(info, state.answers),
    [info, state.answers]
  )

  const interviewState = useMemo(
    () => toInterviewState(state, sections),
    [state, sections]
  )

  const start = useCallback(() => {
    dispatch({ type: 'START', sections })
  }, [sections])

  const advance = useCallback(() => {
    dispatch({ type: 'ADVANCE', sections })
  }, [sections])

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK', sections })
  }, [sections])

  const answerQ = useCallback(
    (nodeId: string, answer: boolean) => {
      // Pass info so reducer can rebuild sections with fresh answers
      dispatch({ type: 'ANSWER_AND_ADVANCE', nodeId, answer, info })
    },
    [info]
  )

  const goToSection = useCallback(
    (sectionIndex: number) => {
      dispatch({ type: 'JUMP_TO_SECTION', sectionIndex, sections })
    },
    [sections]
  )

  const finish = useCallback(() => {
    dispatch({ type: 'FINISH', sections })
  }, [sections])

  const progressValue = overallProgress(interviewState)
  const sectionProgressValues = sections.map((_, i) =>
    sectionProgress(interviewState, i)
  )

  const value: InterviewContextValue = {
    sections,
    status: state.status,
    currentSection: getCurrentSection(interviewState),
    currentNode: getCurrentNode(interviewState),
    progress: progressValue,
    sectionProgressValues,
    sectionIndex: state.sectionIndex,
    start,
    advance,
    goBack,
    answerQuestion: answerQ,
    goToSection,
    finish
  }

  return <InterviewCtx.Provider value={value}>{children}</InterviewCtx.Provider>
}

export const useInterview = (): InterviewContextValue => {
  const ctx = useContext(InterviewCtx)
  if (!ctx) {
    throw new Error('useInterview must be used within InterviewProvider')
  }
  return ctx
}
