import { ReactElement } from 'react'
import {
  createStyles,
  makeStyles,
  Theme,
  Typography,
  Button,
  Paper,
  Box,
  Breadcrumbs,
  Chip
} from '@material-ui/core'
import NavigateNextIcon from '@material-ui/icons/NavigateNext'
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore'
import { isMobileOnly as isMobile } from 'react-device-detect'
import { InterviewProvider, useInterview } from './InterviewContext'
import ProgressSidebar from './ProgressSidebar'
import QuestionNode from './QuestionNode'
import ReviewSummary from './ReviewSummary'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      height: '100%',
      minHeight: 'calc(100vh - 64px)'
    },
    content: {
      flex: 1,
      padding: theme.spacing(3),
      maxWidth: 800,
      margin: '0 auto',
      width: '100%'
    },
    startScreen: {
      textAlign: 'center',
      padding: theme.spacing(6),
      maxWidth: 600,
      margin: '0 auto'
    },
    startButton: {
      marginTop: theme.spacing(3),
      padding: theme.spacing(1.5, 6)
    },
    completeScreen: {
      textAlign: 'center',
      padding: theme.spacing(6),
      maxWidth: 600,
      margin: '0 auto'
    },
    navBar: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing(3),
      paddingTop: theme.spacing(2),
      borderTop: `1px solid ${theme.palette.divider}`
    },
    breadcrumb: {
      marginBottom: theme.spacing(2)
    },
    sectionChip: {
      fontWeight: 600
    },
    mobileProgress: {
      padding: theme.spacing(1, 2),
      borderBottom: `1px solid ${theme.palette.divider}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }
  })
)

/**
 * The start screen shown before the interview begins.
 */
const StartScreen = (): ReactElement => {
  const classes = useStyles()
  const { start } = useInterview()

  return (
    <div className={classes.startScreen}>
      <Typography variant="h3" gutterBottom>
        Tax Return Interview
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        We&apos;ll guide you through your tax return step by step. Answer a few
        questions and we&apos;ll determine which forms you need to fill out.
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        You can always go back and change your answers. Your data is saved
        automatically as you go.
      </Typography>
      <Button
        variant="contained"
        color="primary"
        size="large"
        className={classes.startButton}
        onClick={start}
      >
        Begin Interview
      </Button>
    </div>
  )
}

/**
 * The completion screen shown after the interview is finished.
 */
const CompleteScreen = (): ReactElement => {
  const classes = useStyles()

  return (
    <div className={classes.completeScreen}>
      <Typography variant="h4" gutterBottom>
        Interview Complete
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        You&apos;ve completed all the interview questions. Your tax return data
        has been saved. You can now review and print your return from the main
        navigation.
      </Typography>
    </div>
  )
}

/**
 * The main interview content area that shows the current node
 * with navigation controls.
 */
const InterviewContent = (): ReactElement => {
  const classes = useStyles()
  const { status, currentSection, currentNode, advance, goBack } =
    useInterview()

  if (status === 'not_started') return <StartScreen />
  if (status === 'complete') return <CompleteScreen />
  if (status === 'reviewing') return <ReviewSummary />

  if (!currentSection || !currentNode) return <StartScreen />

  return (
    <div className={classes.content}>
      <Breadcrumbs separator="/" className={classes.breadcrumb}>
        <Chip
          label={currentSection.title}
          size="small"
          color="primary"
          variant="outlined"
          className={classes.sectionChip}
        />
        <Typography color="textPrimary" variant="body2">
          {currentNode.title}
        </Typography>
      </Breadcrumbs>

      <QuestionNode node={currentNode} />

      {currentNode.type === 'form' && (
        <div className={classes.navBar}>
          <Button
            variant="outlined"
            startIcon={<NavigateBeforeIcon />}
            onClick={goBack}
          >
            Back
          </Button>
          <Button
            variant="contained"
            color="primary"
            endIcon={<NavigateNextIcon />}
            onClick={advance}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Mobile progress header shown instead of sidebar on small screens.
 */
const MobileProgressHeader = (): ReactElement => {
  const classes = useStyles()
  const { currentSection, progress } = useInterview()

  return (
    <Paper className={classes.mobileProgress} elevation={1} square>
      <Typography variant="body2">
        <strong>{currentSection?.title ?? 'Interview'}</strong>
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {progress}% complete
      </Typography>
    </Paper>
  )
}

/**
 * Main interview layout with sidebar progress and content area.
 * On mobile, the sidebar collapses to a top progress bar.
 */
const InterviewLayoutInner = (): ReactElement => {
  const classes = useStyles()
  const { status } = useInterview()

  const showSidebar = !isMobile && status !== 'not_started'

  return (
    <div className={classes.root}>
      {showSidebar && <ProgressSidebar />}
      <Box flex={1} display="flex" flexDirection="column">
        {isMobile && status !== 'not_started' && <MobileProgressHeader />}
        <InterviewContent />
      </Box>
    </div>
  )
}

/**
 * Top-level interview layout component.
 * Wraps content with InterviewProvider for state management.
 */
const InterviewLayout = (): ReactElement => (
  <InterviewProvider>
    <InterviewLayoutInner />
  </InterviewProvider>
)

export default InterviewLayout
