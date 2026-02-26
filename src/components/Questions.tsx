import { ReactElement, useEffect } from 'react'
import { Helmet } from 'react-helmet'
import { Box, Grid, List, ListItem } from '@material-ui/core'
import Alert from '@material-ui/lab/Alert'
import { useDispatch, useSelector, TaxesState } from 'ustaxes/redux'
import { QuestionTagName, Responses } from 'ustaxes/core/data'
import { getRequiredQuestions } from 'ustaxes/core/data/questions'
import { LabeledCheckbox, LabeledInput } from './input'
import { answerQuestion } from 'ustaxes/redux/actions'
import { FormProvider, useForm } from 'react-hook-form'
import { usePager } from './pager'
import _ from 'lodash'
import { intentionallyFloat } from 'ustaxes/core/util'

const emptyQuestions: Responses = {
  CRYPTO: false,
  FOREIGN_ACCOUNT_EXISTS: false,
  FINCEN_114: false,
  FINCEN_114_ACCOUNT_COUNTRY: '',
  FORM_8938_REQUIRED: false,
  FORM_8938_ASSET_CATEGORIES: '',
  FORM_8938_MAX_VALUE: '',
  FORM_8938_INCOME_REPORTED: '',
  FOREIGN_TRUST_RELATIONSHIP: false,
  LIVE_APART_FROM_SPOUSE: false,
  HSA_TESTING_PERIOD_FAILED: false
}

const Questions = (): ReactElement => {
  const information = useSelector((state: TaxesState) => state.information)

  const stateAnswers: Responses = {
    ...emptyQuestions,
    ...information.questions
  }

  const methods = useForm<Responses>({ defaultValues: stateAnswers })

  const {
    handleSubmit,
    getValues,
    reset,
    formState: { isDirty }
  } = methods

  const currentValues = getValues()

  const { navButtons, onAdvance } = usePager()

  const questions = getRequiredQuestions({
    ...information,
    questions: {
      ...information.questions,
      ...currentValues
    }
  })

  const currentAnswers: Responses = { ...emptyQuestions, ...currentValues }
  const showFbarGuidance = currentAnswers.FINCEN_114 ?? false
  const showForm8938Guidance = currentAnswers.FORM_8938_REQUIRED ?? false

  // This form can be rerendered because the global state was modified by
  // another control.
  useEffect(() => {
    if (!isDirty && !_.isEqual(currentAnswers, stateAnswers)) {
      reset(stateAnswers)
    }
  }, [])

  const dispatch = useDispatch()

  const onSubmit = (responses: Responses): void => {
    // fix to remove unrequired answers:
    const qtags = questions.map((q) => q.tag)
    const unrequired = Object.keys(responses).filter(
      (rtag) => qtags.find((t) => t === (rtag as QuestionTagName)) === undefined
    )

    const newResponses = {
      ...responses,
      ...Object.fromEntries(unrequired.map((k) => [k, undefined]))
    }

    dispatch(answerQuestion(newResponses))
    onAdvance()
  }

  const page = (
    <form tabIndex={-1} onSubmit={intentionallyFloat(handleSubmit(onSubmit))}>
      <Helmet>
        <title>Informational Questions | Results | UsTaxes.org</title>
      </Helmet>
      <h2>Informational Questions</h2>
      <p>
        Based on your prior responses, responses to these questions are
        required.
      </p>
      <Grid container spacing={2}>
        <List>
          {questions.map((q, i) => (
            <ListItem key={i}>
              {(() => {
                if (q.valueTag === 'boolean') {
                  return <LabeledCheckbox name={q.tag} label={q.text} />
                }
                return <LabeledInput name={q.tag} label={q.text} />
              })()}
            </ListItem>
          ))}
        </List>
      </Grid>
      {(showFbarGuidance || showForm8938Guidance) && (
        <Box marginTop={2}>
          {showFbarGuidance && (
            <Alert severity="info">
              FBAR reminder: FinCEN Form 114 is filed separately from your IRS
              return. If required, file electronically with FinCEN and report
              the highest value of each foreign account and the country where
              it is located. UsTaxes does not submit the FBAR for you.
            </Alert>
          )}
          {showForm8938Guidance && (
            <Box marginTop={2}>
              <Alert severity="info">
                Form 8938 reminder: Form 8938 (FATCA) is attached to your Form
                1040. UsTaxes does not generate Form 8938. Keep the asset
                categories, maximum value, and income details you entered above
                so you can complete the form if required.
              </Alert>
            </Box>
          )}
        </Box>
      )}
      {navButtons}
    </form>
  )
  return <FormProvider {...methods}>{page}</FormProvider>
}

export default Questions
