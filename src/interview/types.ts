import { ReactElement } from 'react'

/**
 * Represents a single step in the interview flow.
 * Nodes are either gating questions (yes/no to determine relevance)
 * or form nodes that render an existing form component.
 */
export interface InterviewNode {
  id: string
  title: string
  description: string
  type: 'question' | 'form'
  // For 'question' type: a yes/no gating question
  // For 'form' type: renders the form component
  component: ReactElement
  // URL of the existing form page (for 'form' type nodes)
  url?: string
  // Determines if this node should be shown based on current state
  shouldShow?: () => boolean
  // For question nodes: the key to store the answer
  answerKey?: string
}

/**
 * A section groups related interview nodes.
 * Maps to major tax categories like Income, Deductions, Credits.
 */
export interface InterviewSection {
  id: string
  title: string
  description: string
  icon?: string
  nodes: InterviewNode[]
}

/**
 * The possible states of the interview state machine.
 */
export type InterviewStatus =
  | 'not_started'
  | 'in_progress'
  | 'reviewing'
  | 'complete'

/**
 * Tracks which nodes have been visited/completed in the interview.
 */
export interface InterviewProgress {
  currentSectionIndex: number
  currentNodeIndex: number
  completedNodes: Set<string>
  skippedNodes: Set<string>
  answers: Record<string, boolean>
}

/**
 * Full state of the interview engine.
 */
export interface InterviewState {
  status: InterviewStatus
  sections: InterviewSection[]
  progress: InterviewProgress
}
