export {
  EDITABLE_STEP_TYPES,
  isEditableStepType,
  validateAndSerializeStepContent,
  LessonEditorValidationError,
  type EditableStepType,
} from './content-schema'

export { assertYoutubeVideoExists, YoutubeVerificationError } from './youtube'

export {
  editGlobalStepContent,
  setClassContentOverride,
  LessonEditorError,
  LessonEditorInputError,
  LESSON_STEP_CONTENT_EDITED,
  type StepContentEditInput,
} from './edit'

export {
  addLessonStep,
  removeLessonStep,
  reorderLessonSteps,
  countAffectedStudentProgress,
  LessonStructureError,
  LESSON_STEP_ADDED,
  LESSON_STEP_REMOVED,
  LESSON_STEPS_REORDERED,
  type AddStepInput,
} from './structure'

export {
  addClassModule,
  editClassModule,
  deleteClassModule,
  reorderClassPlan,
  resetClassPlanOrder,
  setClassModuleVisibility,
  isTeacherAddableStepType,
  ClassStructureError,
  TEACHER_ADDABLE_STEP_TYPES,
  MAX_CLASS_MODULES_PER_LESSON,
  CLASS_LESSON_STEP_ADDED,
  CLASS_LESSON_STEP_EDITED,
  CLASS_LESSON_STEP_REMOVED,
  CLASS_LESSON_PLAN_REORDERED,
  type AddClassModuleInput,
  type EditClassModuleInput,
  type ReorderClassPlanInput,
  type ModulePlacement,
  type TeacherAddableStepType,
} from './class-structure'
