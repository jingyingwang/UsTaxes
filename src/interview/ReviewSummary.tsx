import { ReactElement } from 'react'
import {
  createStyles,
  makeStyles,
  Theme,
  Typography,
  Grid,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Box
} from '@material-ui/core'
import CheckCircleIcon from '@material-ui/icons/CheckCircle'
import SkipNextIcon from '@material-ui/icons/SkipNext'
import EditIcon from '@material-ui/icons/Edit'
import { useInterview } from './InterviewContext'
import { visibleNodes } from './InterviewEngine'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      padding: theme.spacing(3)
    },
    sectionPaper: {
      padding: theme.spacing(2),
      marginBottom: theme.spacing(2)
    },
    completedIcon: {
      color: theme.palette.success.main
    },
    skippedIcon: {
      color: theme.palette.text.disabled
    },
    editButton: {
      marginLeft: 'auto'
    },
    finishButton: {
      marginTop: theme.spacing(3)
    },
    sectionTitle: {
      marginBottom: theme.spacing(1)
    }
  })
)

/**
 * Review summary shown when all interview questions/forms are completed.
 * Shows what was answered/completed in each section and allows
 * navigating back to edit specific sections.
 */
const ReviewSummary = (): ReactElement => {
  const classes = useStyles()
  const { state, goToSection, finish } = useInterview()

  return (
    <div className={classes.root}>
      <Typography variant="h4" gutterBottom>
        Review Your Return
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Review the sections below. Click &quot;Edit&quot; to go back and make
        changes to any section.
      </Typography>

      {state.sections.map((section, sectionIdx) => {
        const visible = visibleNodes(section)
        const completed = visible.filter((n) =>
          state.progress.completedNodes.has(n.id)
        )
        const skipped = visible.filter((n) =>
          state.progress.skippedNodes.has(n.id)
        )

        return (
          <Paper
            key={section.id}
            className={classes.sectionPaper}
            variant="outlined"
          >
            <Grid container alignItems="center">
              <Grid item xs>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {section.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {completed.length} completed
                  {skipped.length > 0 ? `, ${skipped.length} skipped` : ''}
                </Typography>
              </Grid>
              <Grid item>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => goToSection(sectionIdx)}
                >
                  Edit
                </Button>
              </Grid>
            </Grid>
            <Divider style={{ margin: '8px 0' }} />
            <List dense>
              {visible
                .filter((n) => n.type === 'form')
                .map((node) => {
                  const isCompleted = state.progress.completedNodes.has(node.id)
                  const isSkipped = state.progress.skippedNodes.has(node.id)

                  return (
                    <ListItem key={node.id}>
                      <ListItemIcon>
                        {isCompleted ? (
                          <CheckCircleIcon className={classes.completedIcon} />
                        ) : isSkipped ? (
                          <SkipNextIcon className={classes.skippedIcon} />
                        ) : (
                          <CheckCircleIcon className={classes.completedIcon} />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={node.title}
                        secondary={node.description}
                      />
                    </ListItem>
                  )
                })}
            </List>
          </Paper>
        )
      })}

      <Box textAlign="center">
        <Button
          variant="contained"
          color="primary"
          size="large"
          className={classes.finishButton}
          onClick={finish}
        >
          Continue to Review and Print
        </Button>
      </Box>
    </div>
  )
}

export default ReviewSummary
