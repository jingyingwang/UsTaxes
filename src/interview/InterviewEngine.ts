import { InterviewState, InterviewSection, InterviewNode } from './types'

/**
 * Creates a fresh interview state from a list of sections.
 * Each call produces independent Set instances to avoid shared mutable state.
 */
export const createInterviewState = (
  sections: InterviewSection[]
): InterviewState => ({
  status: 'not_started',
  sections,
  progress: {
    currentSectionIndex: 0,
    currentNodeIndex: 0,
    completedNodes: new Set(),
    skippedNodes: new Set(),
    answers: {}
  }
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
 * or undefined if past the end or hidden.
 */
export const currentNode = (
  state: InterviewState
): InterviewNode | undefined => {
  const section = currentSection(state)
  if (!section) return undefined
  const node: InterviewNode | undefined =
    section.nodes[state.progress.currentNodeIndex]
  if (!node) return undefined
  // Verify the node is still visible
  if (node.shouldShow && !node.shouldShow()) return undefined
  return node
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
 * Record an answer for a gating question node and mark it completed.
 * When answer is false, marks hidden dependent nodes as skipped.
 */
export const answerGatingQuestion = (
  state: InterviewState,
  nodeId: string,
  answer: boolean
): InterviewState => {
  const completedNodes = new Set(state.progress.completedNodes)
  completedNodes.add(nodeId)

  const newAnswers = {
    ...state.progress.answers,
    [nodeId]: answer
  }

  // When answering "No", mark dependent form nodes as skipped
  const skippedNodes = new Set(state.progress.skippedNodes)
  if (!answer) {
    const section = currentSection(state)
    if (section) {
      // Find the form node(s) immediately following this gating question
      // that depend on this answer. They are the consecutive form nodes
      // right after this question in the same section.
      const qIdx = section.nodes.findIndex((n) => n.id === nodeId)
      for (let i = qIdx + 1; i < section.nodes.length; i++) {
        const n = section.nodes[i]
        if (n.type === 'question') break // Hit the next gating question
        skippedNodes.add(n.id)
      }
    }
  }

  return {
    ...state,
    progress: {
      ...state.progress,
      completedNodes,
      skippedNodes,
      answers: newAnswers
    }
  }
}

/**
 * Answer a gating question and immediately advance to the next visible node.
 * This is an atomic operation that avoids stale-closure issues.
 */
export const answerAndAdvance = (
  state: InterviewState,
  nodeId: string,
  answer: boolean
): InterviewState => {
  const answered = answerGatingQuestion(state, nodeId, answer)
  return advanceInterview(answered)
}

/**
 * Jump to a specific section (e.g., from the progress sidebar).
 * If no visible nodes exist in the target section, finds the next
 * section with visible nodes.
 */
export const jumpToSection = (
  state: InterviewState,
  sectionIndex: number
): InterviewState => {
  if (sectionIndex < 0 || sectionIndex >= state.sections.length) return state

  // Search forward from the target section for a visible node
  for (let si = sectionIndex; si < state.sections.length; si++) {
    const section = state.sections[si]
    const firstVisible = section.nodes.findIndex(
      (n) => !n.shouldShow || n.shouldShow()
    )
    if (firstVisible >= 0) {
      return {
        ...state,
        status: 'in_progress',
        progress: {
          ...state.progress,
          currentSectionIndex: si,
          currentNodeIndex: firstVisible
        }
      }
    }
  }

  return state
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
  const section: InterviewSection | undefined = state.sections[sectionIndex]
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
