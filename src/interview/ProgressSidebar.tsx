import { ReactElement } from 'react'
import {
  createStyles,
  makeStyles,
  Theme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  LinearProgress,
  Box
} from '@material-ui/core'
import CheckCircleIcon from '@material-ui/icons/CheckCircle'
import RadioButtonUncheckedIcon from '@material-ui/icons/RadioButtonUnchecked'
import PlayCircleFilledIcon from '@material-ui/icons/PlayCircleFilled'
import { useInterview } from './InterviewContext'

const sidebarWidth = 260

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: sidebarWidth,
      flexShrink: 0,
      borderRight: `1px solid ${theme.palette.divider}`,
      height: '100%',
      overflowY: 'auto'
    },
    header: {
      padding: theme.spacing(2),
      borderBottom: `1px solid ${theme.palette.divider}`
    },
    overallProgress: {
      marginTop: theme.spacing(1)
    },
    sectionItem: {
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: theme.palette.action.hover
      }
    },
    activeSection: {
      backgroundColor: theme.palette.action.selected,
      borderLeft: `3px solid ${theme.palette.primary.main}`
    },
    completedIcon: {
      color: theme.palette.success.main
    },
    activeIcon: {
      color: theme.palette.primary.main
    },
    pendingIcon: {
      color: theme.palette.text.disabled
    },
    progressBar: {
      marginTop: theme.spacing(0.5),
      height: 4,
      borderRadius: 2
    },
    sectionDescription: {
      fontSize: '0.75rem',
      color: theme.palette.text.secondary
    }
  })
)

const ProgressSidebar = (): ReactElement => {
  const classes = useStyles()
  const {
    sections,
    progress,
    sectionProgressValues,
    sectionIndex,
    goToSection
  } = useInterview()

  const currentSectionIdx = sectionIndex

  const getSectionIcon = (sectionIndex: number): ReactElement => {
    const pct = sectionProgressValues[sectionIndex]
    if (pct >= 100) {
      return <CheckCircleIcon className={classes.completedIcon} />
    }
    if (sectionIndex === currentSectionIdx) {
      return <PlayCircleFilledIcon className={classes.activeIcon} />
    }
    return <RadioButtonUncheckedIcon className={classes.pendingIcon} />
  }

  return (
    <div className={classes.root}>
      <div className={classes.header}>
        <Typography variant="subtitle1">
          <strong>Interview Progress</strong>
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {progress}% complete
        </Typography>
        <LinearProgress
          variant="determinate"
          value={progress}
          className={classes.overallProgress}
        />
      </div>
      <List>
        {sections.map((section, idx) => (
          <ListItem
            key={section.id}
            className={`${classes.sectionItem} ${
              idx === currentSectionIdx ? classes.activeSection : ''
            }`}
            onClick={() => goToSection(idx)}
          >
            <ListItemIcon>{getSectionIcon(idx)}</ListItemIcon>
            <ListItemText
              primary={section.title}
              secondary={
                <Box>
                  <Typography className={classes.sectionDescription}>
                    {section.description}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={sectionProgressValues[idx]}
                    className={classes.progressBar}
                  />
                </Box>
              }
            />
          </ListItem>
        ))}
      </List>
    </div>
  )
}

export default ProgressSidebar
