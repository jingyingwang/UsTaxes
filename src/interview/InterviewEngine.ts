import {
  InterviewState,
  InterviewSection,
  InterviewNode,
  InterviewProgress,
  InterviewStatus
} from './types'

const initialProgress: InterviewProgress = {
  currentSectionIndex: 0,
  currentNodeIndex: 0,
  completedNodes: new Set(),
  skippedNodes: new Set(),
  answers: {}
}

/**
 * Creates a fresh interview state from a list of sections.
 */
export const createInterviewState = (
  sections: InterviewSection[]
): InterviewState => ({
  status: 'not_started',
  sections,
  progress: { ...initialProgress }
})

/**
 * Returns the current section, or undefined if past the end.
 */
export const currentSection = (
  state: InterviewState
): InterviewSection | undefined =>
  state.sections[state.progress.currentSectionIndex]

/**
 * Returns the current node within the current section,
 * or undefined if past the end.
 */
export const currentNode = (
  state: InterviewState
): InterviewNode | undefined => {
  const section = currentSection(state)
  if (!section) return undefined
  return section.nodes[state.progress.currentNodeIndex]
}

/**
 * Returns visible nodes for a section, filtering by shouldShow.
 */
export const visibleNodes = (section: InterviewSection): InterviewNode[] =>
  section.nodes.filter((node) => !node.shouldShow || node.shouldShow())

/**
 * Finds the next visible node starting from the current position.
 * Advances through sections if needed.
 */
const findNextVisibleNode = (
  state: InterviewState
): { sectionIndex: number; nodeIndex: number } | null => {
  let sectionIdx = state.progress.currentSectionIndex
  let nodeIdx = state.progress.currentNodeIndex + 1

  while (sectionIdx < state.sections.length) {
    const section = state.sections[sectionIdx]
    while (nodeIdx < section.nodes.length) {
      const node = section.nodes[nodeIdx]
      if (!node.shouldShow || node.shouldShow()) {
        return { sectionIndex: sectionIdx, nodeIndex: nodeIdx }
      }
      nodeIdx++
    }
    sectionIdx++
    nodeIdx = 0
  }

  return null
}

/**
 * Finds the previous visible node from the current position.
 */
const findPrevVisibleNode = (
  state: InterviewState
): { sectionIndex: number; nodeIndex: number } | null => {
  let sectionIdx = state.progress.currentSectionIndex
  let nodeIdx = state.progress.currentNodeIndex - 1

  while (sectionIdx >= 0) {
    const section = state.sections[sectionIdx]
    while (nodeIdx >= 0) {
      const node = section.nodes[nodeIdx]
      if (!node.shouldShow || node.shouldShow()) {
        return { sectionIndex: sectionIdx, nodeIndex: nodeIdx }
      }
      nodeIdx--
    }
    sectionIdx--
    if (sectionIdx >= 0) {
      nodeIdx = state.sections[sectionIdx].nodes.length - 1
    }
  }

  return null
}

/**
 * Advance to the next node, marking the current one as completed.
 * Returns updated state. Transitions to 'reviewing' when all nodes are done.
 */
export const advanceInterview = (state: InterviewState): InterviewState => {
  const node = currentNode(state)
  const completedNodes = new Set(state.progress.completedNodes)
  if (node) {
    completedNodes.add(node.id)
  }

  const next = findNextVisibleNode(state)

  if (!next) {
    return {
      ...state,
      status: 'reviewing',
      progress: { ...state.progress, completedNodes }
    }
  }

  return {
    ...state,
    status: 'in_progress',
    progress: {
      ...state.progress,
      completedNodes,
      currentSectionIndex: next.sectionIndex,
      currentNodeIndex: next.nodeIndex
    }
  }
}

/**
 * Go back to the previous visible node.
 */
export const goBackInterview = (state: InterviewState): InterviewState => {
  const prev = findPrevVisibleNode(state)
  if (!prev) return state

  return {
    ...state,
    status: 'in_progress',
    progress: {
      ...state.progress,
      currentSectionIndex: prev.sectionIndex,
      currentNodeIndex: prev.nodeIndex
    }
  }
}

/**
 * Record an answer for a gating question node.
 * If the answer is false, dependent form nodes in the same section
 * are skipped.
 */
export const answerGatingQuestion = (
  state: InterviewState,
  nodeId: string,
  answer: boolean
): InterviewState => {
  return {
    ...state,
    progress: {
      ...state.progress,
      answers: {
        ...state.progress.answers,
        [nodeId]: answer
      }
    }
  }
}

/**
 * Jump to a specific section (e.g., from the progress sidebar).
 */
export const jumpToSection = (
  state: InterviewState,
  sectionIndex: number
): InterviewState => {
  if (sectionIndex < 0 || sectionIndex >= state.sections.length) return state

  const section = state.sections[sectionIndex]
  const firstVisible = section.nodes.findIndex(
    (n) => !n.shouldShow || n.shouldShow()
  )

  return {
    ...state,
    status: 'in_progress',
    progress: {
      ...state.progress,
      currentSectionIndex: sectionIndex,
      currentNodeIndex: firstVisible >= 0 ? firstVisible : 0
    }
  }
}

/**
 * Start the interview.
 */
export const startInterview = (state: InterviewState): InterviewState => {
  // Find the first visible node
  const firstState: InterviewState = {
    ...state,
    status: 'in_progress',
    progress: {
      ...state.progress,
      currentSectionIndex: 0,
      currentNodeIndex: -1
    }
  }

  const next = findNextVisibleNode(firstState)
  if (!next) {
    return { ...state, status: 'reviewing' }
  }

  return {
    ...state,
    status: 'in_progress',
    progress: {
      ...state.progress,
      currentSectionIndex: next.sectionIndex,
      currentNodeIndex: next.nodeIndex
    }
  }
}

/**
 * Mark the interview as complete (from reviewing state).
 */
export const completeInterview = (state: InterviewState): InterviewState => ({
  ...state,
  status: 'complete'
})

/**
 * Calculate progress percentage for a section.
 */
export const sectionProgress = (
  state: InterviewState,
  sectionIndex: number
): number => {
  const section = state.sections[sectionIndex]
  if (!section) return 0

  const visible = visibleNodes(section)
  if (visible.length === 0) return 100

  const completed = visible.filter(
    (n) =>
      state.progress.completedNodes.has(n.id) ||
      state.progress.skippedNodes.has(n.id)
  ).length

  return Math.round((completed / visible.length) * 100)
}

/**
 * Calculate overall interview progress percentage.
 */
export const overallProgress = (state: InterviewState): number => {
  const allVisible = state.sections.flatMap(visibleNodes)
  if (allVisible.length === 0) return 100

  const completed = allVisible.filter(
    (n) =>
      state.progress.completedNodes.has(n.id) ||
      state.progress.skippedNodes.has(n.id)
  ).length

  return Math.round((completed / allVisible.length) * 100)
}

/**
 * Get the new status based on progress.
 */
export const deriveStatus = (state: InterviewState): InterviewStatus => {
  if (state.progress.completedNodes.size === 0) return 'not_started'
  const allVisible = state.sections.flatMap(visibleNodes)
  const allDone = allVisible.every(
    (n) =>
      state.progress.completedNodes.has(n.id) ||
      state.progress.skippedNodes.has(n.id)
  )
  return allDone ? 'reviewing' : 'in_progress'
}
