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
