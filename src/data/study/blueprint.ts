// 출제 청사진(blueprint)
//
// 문신사 국가시험은 출제기준이 아직 미공개이나, 이미 시행 중인 미용사 국가시험
// (한국산업인력공단/큐넷)과 과목이 크게 겹친다(공중보건·소독·공중위생법규·화장품학·
// 피부학·해부생리). 아래 분류·가중치는 **공개된 출제기준의 과목·세부항목과 출제 비중**을
// 참고해 우리 교과서 11개 PART에 맞춰 작성한 것이다.
//
// ⚠️ 기출문제 "원문"은 큐넷에 저작권이 있으므로 수집·복제하지 않는다. 본 파일은 오직
//    범위·세부항목·난이도·비중의 가중치만 정의하며, 실제 문항은 원본/AI 생성으로 채운다.

import type { SubjectKey } from './questions'

export interface TopicSpec {
  /** 토픽 식별자 (예: 'hygiene.disinfection') */
  key: string
  /** 세부항목 한글명 */
  label: string
  /** 과목 내 상대 출제 비중 */
  weight: number
  /** 연결된 교과서 PART id (복습 링크) */
  parts: string[]
  /** 미용사 국가시험과 직접 중첩되는 영역인지(슈퍼셋 검증용) */
  cosmetology: boolean
}

export interface SubjectBlueprint {
  subject: SubjectKey
  /** 시험 전체에서 이 과목의 목표 출제 비중(0~1, 합 ≈ 1) */
  examWeight: number
  topics: TopicSpec[]
}

/**
 * 과목별 출제 비중은 위생·감염을 가장 무겁게(필기·실기 공통 핵심) 두고,
 * 해부·피부, 재료·색소, 법규 순으로 배분한다.
 */
export const BLUEPRINT: SubjectBlueprint[] = [
  {
    subject: 'hygiene',
    examWeight: 0.34,
    topics: [
      { key: 'hygiene.publichealth', label: '공중보건 일반·예방', weight: 1, parts: ['public-health'], cosmetology: true },
      { key: 'hygiene.disease', label: '질병 관리·역학·면역', weight: 1, parts: ['public-health'], cosmetology: true },
      { key: 'hygiene.infection', label: '감염원·감염관리(표준주의)', weight: 1.5, parts: ['health-sanitation'], cosmetology: true },
      { key: 'hygiene.disinfection', label: '소독·멸균', weight: 1.5, parts: ['health-sanitation'], cosmetology: true },
      { key: 'hygiene.environment', label: '환경·폐기물 관리', weight: 1, parts: ['health-sanitation'], cosmetology: true },
      { key: 'hygiene.bbp', label: '혈행성 감염(BBP)', weight: 1.5, parts: ['bbp'], cosmetology: false },
    ],
  },
  {
    subject: 'anatomy',
    examWeight: 0.26,
    topics: [
      { key: 'anatomy.skin_structure', label: '피부 구조(표피·진피·피하)', weight: 1.5, parts: ['skin'], cosmetology: true },
      { key: 'anatomy.skin_appendage', label: '부속기관·피부 유형', weight: 1, parts: ['skin'], cosmetology: true },
      { key: 'anatomy.skin_disease', label: '피부 질환·시술 금기', weight: 1, parts: ['skin'], cosmetology: true },
      { key: 'anatomy.wound', label: '상처 치유·흉터', weight: 1, parts: ['skin'], cosmetology: true },
      { key: 'anatomy.skull', label: '두개골·안면 골격', weight: 0.8, parts: ['face-anatomy'], cosmetology: true },
      { key: 'anatomy.face', label: '안면 구조·비례·혈관/위험부위', weight: 0.8, parts: ['face-anatomy'], cosmetology: false },
      { key: 'anatomy.scalp_hair', label: '두피·모발', weight: 0.6, parts: ['scalp-hair'], cosmetology: true },
    ],
  },
  {
    subject: 'ink_material',
    examWeight: 0.20,
    topics: [
      { key: 'ink.cosmetics', label: '화장품학(원료·제형·기능성)', weight: 1.3, parts: ['cosmetics'], cosmetology: true },
      { key: 'ink.color', label: '색채·색소학', weight: 1, parts: ['color'], cosmetology: true },
      { key: 'ink.pigment_safety', label: '색소 안전성·알레르기·유해성분', weight: 1.2, parts: ['cosmetics', 'color'], cosmetology: false },
      { key: 'ink.tools', label: '바늘·카트리지·머신·일회용', weight: 1, parts: ['practice'], cosmetology: false },
      { key: 'ink.storage', label: '재료 보관·관리·사용기한', weight: 0.8, parts: ['practice'], cosmetology: false },
    ],
  },
  {
    subject: 'law',
    examWeight: 0.20,
    topics: [
      { key: 'law.sanitation_law', label: '공중위생관리법규', weight: 1.3, parts: ['public-health'], cosmetology: true },
      { key: 'law.tattoo_law', label: '문신사법·면허·결격사유', weight: 1.3, parts: ['intro'], cosmetology: false },
      { key: 'law.consent_record', label: '동의·기록·개인정보', weight: 1, parts: ['consult'], cosmetology: false },
      { key: 'law.consult', label: '고객상담·시술 적합성', weight: 0.8, parts: ['consult'], cosmetology: false },
      { key: 'law.practice_ethics', label: '시술자 태도·안전관리·실무', weight: 1, parts: ['intro', 'practice'], cosmetology: false },
    ],
  },
]

const BY_SUBJECT: Record<SubjectKey, SubjectBlueprint> = Object.fromEntries(
  BLUEPRINT.map((b) => [b.subject, b])
) as Record<SubjectKey, SubjectBlueprint>

const ALL_TOPICS: TopicSpec[] = BLUEPRINT.flatMap((b) => b.topics)
const TOPIC_MAP: Record<string, TopicSpec> = Object.fromEntries(
  ALL_TOPICS.map((t) => [t.key, t])
)

/** 적응형 엔진의 과목 기본 가중치(목표 출제 비중) */
export function subjectExamWeights(): Record<SubjectKey, number> {
  return Object.fromEntries(BLUEPRINT.map((b) => [b.subject, b.examWeight])) as Record<
    SubjectKey,
    number
  >
}

export function topicsForSubject(subject: SubjectKey): TopicSpec[] {
  return BY_SUBJECT[subject]?.topics ?? []
}

export function allTopics(): TopicSpec[] {
  return ALL_TOPICS
}

export function getTopic(key: string | undefined): TopicSpec | undefined {
  return key ? TOPIC_MAP[key] : undefined
}

/** 토픽(또는 과목)에 연결된 교과서 PART id 목록 — 복습 링크용 */
export function partsForTopic(key: string | undefined): string[] {
  return getTopic(key)?.parts ?? []
}
