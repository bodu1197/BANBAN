// 실제 정의는 lib/event/constants.ts + lib/event/types.ts.
// API route 가 components 를 import 하는 레이어 위반을 막기 위해 이전됨.
// 컴포넌트 import 호환을 위해 여기서 re-export.

export {
  EVENT_CATEGORIES,
  type EventCategory,
  RETOUCH_TYPES,
  type RetouchType,
  TARGET_AUDIENCE_OPTIONS,
  EVENT_FIELD_LIMITS,
  DETAIL_SECTION_TYPES,
  type DetailSectionType,
  DETAIL_SECTION_LABELS,
  EDIT_SECTIONS,
} from "@/lib/event/constants";

export {
  type EventFormValues,
  type EventMediaSlot,
  type GeneratedEventContent,
  type DetailSectionCopy,
  type GeneratedDetailCopy,
  type DetailSectionResult,
  INITIAL_FORM_VALUES,
} from "@/lib/event/types";
