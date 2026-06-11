// 문항 타입 정의(leaf 모듈) — questions.ts ↔ generated-questions.ts 순환 의존 방지를 위해 분리.

export type SubjectKey = 'hygiene' | 'law' | 'ink_material' | 'anatomy'

export type QuestionDifficulty = 1 | 2 | 3 // 1 하 · 2 중 · 3 상
export type QuestionType = 'mcq' | 'ox' | 'cloze'
export type QuestionSource = 'seed' | 'ai'

export interface Question {
  id: string
  subject: SubjectKey
  question: string
  choices: string[]
  /** 정답 보기의 0-based 인덱스 */
  answer: number
  explanation: string
  /** 난이도(하1·중2·상3). 미지정 시 QUESTION_META 또는 기본 2 */
  difficulty?: QuestionDifficulty
  /** blueprint 세부항목 키(예: 'hygiene.disinfection') */
  topic?: string
  /** 문항 유형 */
  type?: QuestionType
  /** 출처: seed(수록) / ai(생성) */
  source?: QuestionSource
}

// 과목 메타(소규모 상수) — 클라 컴포넌트가 전체 QUESTIONS 번들 없이 라벨/아이콘에 쓰도록 leaf 에 둔다.
export interface SubjectMeta {
  key: SubjectKey
  label: string
  desc: string
}

export const SUBJECTS: SubjectMeta[] = [
  { key: 'hygiene', label: '위생·감염 관리', desc: '멸균법, 의료폐기물, 혈액매개 감염병, 소독제, 개인보호구' },
  { key: 'law', label: '법규·면허', desc: '문신사법 원칙, 면허·결격사유, 동의·기록, 무면허 시술 금지' },
  { key: 'ink_material', label: '색소·염료·재료', desc: '색소 안전성, 알레르기, 바늘·카트리지, 보관·관리' },
  { key: 'anatomy', label: '기초 해부·피부학', desc: '피부 구조와 층, 색소 안착 깊이, 상처 치유, 켈로이드' },
]

export const SUBJECT_MAP: Record<SubjectKey, SubjectMeta> = Object.fromEntries(
  SUBJECTS.map((s) => [s.key, s]),
) as Record<SubjectKey, SubjectMeta>
