import { ReactElement } from 'react'
import {
  Button,
  Grid,
  Typography,
  Paper,
  createStyles,
  makeStyles,
  Theme
} from '@material-ui/core'
import { InterviewNode } from './types'
import { useInterview } from './InterviewContext'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      padding: theme.spacing(3)
    },
    questionText: {
      marginBottom: theme.spacing(3),
      fontSize: '1.2rem'
    },
    buttonContainer: {
      marginTop: theme.spacing(2)
    },
    yesButton: {
      marginRight: theme.spacing(2),
      minWidth: 120
    },
    noButton: {
      minWidth: 120
    },
    nodeTitle: {
      marginBottom: theme.spacing(1),
      fontWeight: 600
    }
  })
)

interface QuestionNodeProps {
  node: InterviewNode
}

/**
 * Renders a single interview node.
 * For 'question' type: shows a yes/no gating question.
 * For 'form' type: renders the existing form component.
 */
const QuestionNode = ({ node }: QuestionNodeProps): ReactElement => {
  const classes = useStyles()
  const { answerQuestion, advance } = useInterview()

  if (node.type === 'question') {
    const handleAnswer = (answer: boolean) => {
      answerQuestion(node.id, answer)
      advance()
    }

    return (
      <Paper className={classes.root} elevation={0}>
        <Typography variant="h5" className={classes.nodeTitle}>
          {node.title}
        </Typography>
        <Typography className={classes.questionText}>
          {node.description}
        </Typography>
        <Grid container spacing={2} className={classes.buttonContainer}>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              className={classes.yesButton}
              onClick={() => handleAnswer(true)}
              size="large"
            >
              Yes
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              className={classes.noButton}
              onClick={() => handleAnswer(false)}
              size="large"
            >
              No
            </Button>
          </Grid>
        </Grid>
      </Paper>
    )
  }

  // Form type: render the existing component directly
  return <>{node.component}</>
}

export default QuestionNode
