import {
  createContext,
  useContext,
  useState,
  useCallback,
  PropsWithChildren,
  ReactElement,
  useMemo
} from 'react'
import { useSelector } from 'ustaxes/redux'
import { TaxesState } from 'ustaxes/redux'
import {
  InterviewState,
  InterviewSection,
  InterviewNode,
  InterviewStatus
} from './types'
import {
  createInterviewState,
  startInterview,
  advanceInterview,
  goBackInterview,
  answerGatingQuestion,
  jumpToSection,
  completeInterview,
  currentSection as getCurrentSection,
  currentNode as getCurrentNode,
  sectionProgress,
  overallProgress
} from './InterviewEngine'
import { buildQuestionGraph } from './questionGraph'

interface InterviewContextValue {
  state: InterviewState
  status: InterviewStatus
  currentSection: InterviewSection | undefined
  currentNode: InterviewNode | undefined
  progress: number
  sectionProgressValues: number[]

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

  // Gating answers are stored locally (not in Redux) since they're
  // interview-navigation state, not tax data
  const [answers, setAnswers] = useState<Record<string, boolean>>({})

  const sections = useMemo(
    () => buildQuestionGraph(info, answers),
    [info, answers]
  )

  const [interviewState, setInterviewState] = useState<InterviewState>(() =>
    createInterviewState(sections)
  )

  // Keep sections in sync when answers change
  const state: InterviewState = useMemo(
    () => ({ ...interviewState, sections }),
    [interviewState, sections]
  )

  const start = useCallback(() => {
    setInterviewState((s) => startInterview({ ...s, sections }))
  }, [sections])

  const advance = useCallback(() => {
    setInterviewState((s) => advanceInterview({ ...s, sections }))
  }, [sections])

  const goBack = useCallback(() => {
    setInterviewState((s) => goBackInterview({ ...s, sections }))
  }, [sections])

  const answerQ = useCallback(
    (nodeId: string, answer: boolean) => {
      setAnswers((prev) => ({ ...prev, [nodeId]: answer }))
      setInterviewState((s) =>
        answerGatingQuestion({ ...s, sections }, nodeId, answer)
      )
    },
    [sections]
  )

  const goToSection = useCallback(
    (sectionIndex: number) => {
      setInterviewState((s) => jumpToSection({ ...s, sections }, sectionIndex))
    },
    [sections]
  )

  const finish = useCallback(() => {
    setInterviewState((s) => completeInterview({ ...s, sections }))
  }, [sections])

  const progressValue = overallProgress(state)
  const sectionProgressValues = state.sections.map((_, i) =>
    sectionProgress(state, i)
  )

  const value: InterviewContextValue = {
    state,
    status: state.status,
    currentSection: getCurrentSection(state),
    currentNode: getCurrentNode(state),
    progress: progressValue,
    sectionProgressValues,
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
