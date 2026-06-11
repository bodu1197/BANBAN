// 실기 체크리스트 — 위생 순서·세팅 암기 카드 (학습용 샘플)

export interface ChecklistGroup {
  key: string
  title: string
  /** 순서가 의미 있는 단계 목록 */
  steps: string[]
}

export const CHECKLIST: ChecklistGroup[] = [
  {
    key: 'before',
    title: '시술 전 준비',
    steps: [
      '손위생 시행(비누 세척 또는 알코올 손소독)',
      '시술 공간·작업대 표면 소독',
      '멸균 포장 상태·유효기간 확인 후 개봉',
      '일회용 장갑 착용',
      '바늘·잉크 캡 등 일회용 품목 새 것으로 세팅',
      '시술 부위 세척·소독, 필요 시 제모',
      '시술 동의서 작성 및 주의사항 설명',
    ],
  },
  {
    key: 'setup',
    title: '기구 세팅 순서',
    steps: [
      '깨끗한 베리어 필름으로 머신·클립코드·작업면 보호',
      '멸균 카트리지(바늘) 장착',
      '손님마다 새 잉크 캡에 색소 따르기',
      '정제수·소독용품·거즈 준비',
      '폐기물 용기(손상성/일반) 위치 확인',
    ],
  },
  {
    key: 'during',
    title: '시술 중 위생 수칙',
    steps: [
      '오염된 손으로 청결 구역 만지지 않기(교차오염 방지)',
      '필요 시 장갑 교체 및 손위생',
      '남은 잉크는 병에 다시 붓지 않기',
      '바늘 깊이·각도 유지로 과도한 손상 방지',
      '이상반응 발생 시 즉시 중단·확인',
    ],
  },
  {
    key: 'after',
    title: '시술 후 마무리',
    steps: [
      '시술 부위 소독·드레싱',
      '사후관리(애프터케어) 안내',
      '바늘 등 손상성 폐기물 전용 용기에 폐기',
      '일회용품 폐기·재사용 금지',
      '작업면·기구 소독 및 멸균 대상 분리',
      '시술 기록 작성·보관',
    ],
  },
]

export function getChecklistGroup(key: string): ChecklistGroup | undefined {
  return CHECKLIST.find((g) => g.key === key)
}
