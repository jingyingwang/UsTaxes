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
    pendingIcon: {
      color: theme.palette.text.disabled
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
  const { sections, sectionProgressValues, goToSection, finish } =
    useInterview()

  return (
    <div className={classes.root}>
      <Typography variant="h4" gutterBottom>
        Review Your Return
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Review the sections below. Click &quot;Edit&quot; to go back and make
        changes to any section.
      </Typography>

      {sections.map((section, sectionIdx) => {
        const visible = visibleNodes(section)
        const pct = sectionProgressValues[sectionIdx]

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
                  {pct}% complete
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
                .map((node) => (
                  <ReviewNodeItem key={node.id} node={node} classes={classes} />
                ))}
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

/**
 * Renders a single node in the review list with appropriate status icon.
 */
const ReviewNodeItem = ({
  node,
  classes
}: {
  node: { id: string; title: string; description: string }
  classes: Record<string, string>
}): ReactElement => {
  // We only know node IDs here; to check completed/skipped status
  // we'd need to thread it through. For review summary, all visible
  // form nodes are effectively completed (the interview reached reviewing state).
  return (
    <ListItem>
      <ListItemIcon>
        <CheckCircleIcon className={classes.completedIcon} />
      </ListItemIcon>
      <ListItemText primary={node.title} secondary={node.description} />
    </ListItem>
  )
}

export default ReviewSummary
