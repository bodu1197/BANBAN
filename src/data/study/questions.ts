// 문신패스 학습용 예상문제 은행 (샘플)
// ⚠️ 본 문항은 학습용으로 작성된 예상문제이며, 실제 국가시험 문제와 다를 수 있습니다.
// 문신사법은 2025.10.28 공포 / 2027 시행 예정으로, 세부 출제기준은 향후 확정됩니다.

import { GENERATED_QUESTIONS } from './generated-questions'
import type { Question, SubjectKey, QuestionDifficulty, QuestionType, QuestionSource } from './question-types'
import { SUBJECTS, SUBJECT_MAP, type SubjectMeta } from './question-types'

// 타입·과목메타는 question-types.ts(leaf)에 정의 — 순환 방지 + 클라 번들 경량화. 재노출로 기존 import 유지.
export type { Question, SubjectKey, QuestionDifficulty, QuestionType, QuestionSource, SubjectMeta }
export { SUBJECTS, SUBJECT_MAP }

/** 과목 → 약점 복습 시 안내할 교과서 PART id 목록 */
export const SUBJECT_TO_PARTS: Record<SubjectKey, string[]> = {
  hygiene: ['public-health', 'health-sanitation', 'bbp'],
  anatomy: ['face-anatomy', 'skin', 'scalp-hair'],
  ink_material: ['cosmetics', 'color', 'practice'],
  law: ['public-health', 'intro', 'consult'],
}

const SEED_QUESTIONS: Question[] = [
  // ───────────────────────── 위생·감염 관리 ─────────────────────────
  {
    id: 'hygiene-001',
    subject: 'hygiene',
    question: '고압증기멸균기(오토클레이브)의 일반적인 표준 작동 조건으로 가장 알맞은 것은?',
    choices: ['60℃에서 10분', '80℃에서 30분', '121℃에서 약 15~20분', '실온에서 24시간'],
    answer: 2,
    explanation:
      '고압증기멸균은 보통 121℃·약 1기압(15psi)에서 15~20분간 처리합니다. 고온·고압의 포화 증기로 세균의 아포까지 사멸시키는 가장 확실한 멸균법입니다.',
  },
  {
    id: 'hygiene-002',
    subject: 'hygiene',
    question: '멸균(sterilization)과 소독(disinfection)의 차이로 옳은 것은?',
    choices: [
      '둘은 같은 의미이다',
      '멸균은 아포를 포함한 모든 미생물을 사멸시킨다',
      '소독이 멸균보다 강력하다',
      '소독은 바이러스를 100% 제거한다',
    ],
    answer: 1,
    explanation:
      '멸균은 아포(포자)를 포함한 모든 형태의 미생물을 완전히 사멸시키는 것이고, 소독은 아포를 제외한 병원성 미생물을 사멸·제거해 감염력을 없애는 수준입니다.',
  },
  {
    id: 'hygiene-003',
    subject: 'hygiene',
    question: '사용한 일회용 문신 바늘(손상성 폐기물)의 처리 방법으로 옳은 것은?',
    choices: [
      '일반 쓰레기통에 버린다',
      '재멸균하여 재사용한다',
      '뚜껑이 있는 전용 손상성 폐기물 용기에 폐기한다',
      '물로 씻어 재활용한다',
    ],
    answer: 2,
    explanation:
      '주삿바늘 등 손상성 폐기물은 찔림 사고를 막기 위해 뚫리지 않는 전용 용기에 폐기해야 하며, 바늘은 어떠한 경우에도 재사용하지 않습니다.',
  },
  {
    id: 'hygiene-004',
    subject: 'hygiene',
    question: '문신 시술 시 주의해야 할 대표적인 혈액매개 감염병이 아닌 것은?',
    choices: ['B형 간염', 'C형 간염', '후천성면역결핍증(HIV)', '인플루엔자(독감)'],
    answer: 3,
    explanation:
      'B형·C형 간염과 HIV는 혈액을 매개로 전파되어 문신 시술에서 특히 주의해야 합니다. 인플루엔자는 주로 호흡기 비말로 전파됩니다.',
  },
  {
    id: 'hygiene-005',
    subject: 'hygiene',
    question: '손소독에 사용하는 알코올(에탄올) 손소독제의 일반적으로 권장되는 농도 범위는?',
    choices: ['약 10~20%', '약 30~40%', '약 60~80%', '약 95~100%'],
    answer: 2,
    explanation:
      '에탄올은 약 60~80% 농도에서 살균력이 가장 높습니다. 농도가 너무 높으면(95% 이상) 단백질 응고가 빨라 오히려 침투·살균 효과가 떨어집니다.',
  },
  {
    id: 'hygiene-006',
    subject: 'hygiene',
    question: '시술 중 교차오염(cross-contamination)을 예방하는 방법으로 옳지 않은 것은?',
    choices: [
      '시술마다 새 장갑을 착용한다',
      '잉크 캡과 바늘은 일회용을 사용한다',
      '한 장갑으로 여러 손님을 시술한다',
      '작업 표면을 시술 전후 소독한다',
    ],
    answer: 2,
    explanation:
      '하나의 장갑이나 도구로 여러 손님을 시술하면 교차오염의 직접적 원인이 됩니다. 장갑·바늘·잉크 캡은 손님마다 새 것을 사용해야 합니다.',
  },
  {
    id: 'hygiene-007',
    subject: 'hygiene',
    question: '작업대 등 표면 소독에 흔히 사용하는 차아염소산나트륨(락스)에 대한 설명으로 옳은 것은?',
    choices: [
      '원액 그대로 피부에 바른다',
      '적정 농도로 희석하여 표면 소독에 사용한다',
      '금속 도구 멸균의 표준 방법이다',
      '냄새가 없어 환기가 필요 없다',
    ],
    answer: 1,
    explanation:
      '차아염소산나트륨은 적정 농도로 희석해 표면·기물 소독에 사용합니다. 부식성과 자극성이 있어 피부 직접 도포는 금하고, 사용 시 환기가 필요합니다.',
  },
  {
    id: 'hygiene-008',
    subject: 'hygiene',
    question: '멸균이 제대로 이루어졌는지 확인하기 위해 사용하는 지표가 아닌 것은?',
    choices: [
      '화학적 지시계(테이프·인디케이터)',
      '생물학적 지시계(BI)',
      '시술자의 경험과 느낌',
      '멸균기 온도·압력 기록',
    ],
    answer: 2,
    explanation:
      '멸균 검증은 화학적 지시계, 생물학적 지시계(아포 사멸 확인), 물리적 기록(온도·압력·시간)으로 객관적으로 확인합니다. 주관적 판단은 검증 방법이 아닙니다.',
  },
  {
    id: 'hygiene-009',
    subject: 'hygiene',
    question: '개인보호구(PPE) 사용에 대한 설명으로 옳은 것은?',
    choices: [
      '장갑은 찢어지지 않으면 여러 손님에게 사용해도 된다',
      '시술 손님이 바뀌면 장갑을 새로 교체한다',
      '마스크는 시술과 무관하므로 착용하지 않는다',
      '장갑을 끼면 손위생은 생략해도 된다',
    ],
    answer: 1,
    explanation:
      '장갑은 손님마다 새로 교체해야 하며, 장갑 착용 전후에도 손위생을 시행해야 합니다. 장갑 착용이 손위생을 대체하지 않습니다.',
  },
  {
    id: 'hygiene-010',
    subject: 'hygiene',
    question: '시술 전 피부 전처치(준비) 과정으로 가장 적절한 것은?',
    choices: [
      '아무 처치 없이 바로 시술한다',
      '시술 부위를 소독하고 필요 시 제모한다',
      '시술 부위에 보습 오일만 충분히 바른다',
      '뜨거운 물로만 헹군다',
    ],
    answer: 1,
    explanation:
      '시술 부위는 세척·소독하고 필요 시 제모하여 감염 위험을 낮춥니다. 청결한 피부 전처치는 감염 예방의 기본입니다.',
  },
  {
    id: 'hygiene-011',
    subject: 'hygiene',
    question: '멸균 포장된 기구의 보관·사용에 대한 설명으로 옳지 않은 것은?',
    choices: [
      '포장이 젖거나 훼손되면 사용하지 않는다',
      '멸균 유효기간을 표시하고 관리한다',
      '포장이 뜯긴 기구도 보이면 사용한다',
      '건조하고 청결한 곳에 보관한다',
    ],
    answer: 2,
    explanation:
      '포장이 개봉·훼손·오염되었거나 젖은 기구는 멸균 상태를 보장할 수 없으므로 사용하지 않습니다. 유효기간 관리와 건조 보관이 필요합니다.',
  },
  {
    id: 'hygiene-012',
    subject: 'hygiene',
    question: '시술 후 손님에게 안내해야 할 사후관리(애프터케어)로 가장 거리가 먼 것은?',
    choices: [
      '시술 부위를 청결하게 유지하기',
      '딱지를 일부러 떼어내기',
      '과도한 햇빛 노출과 사우나 피하기',
      '이상 증상 시 의료기관 방문 권고',
    ],
    answer: 1,
    explanation:
      '아무는 과정의 딱지를 억지로 떼면 색소 탈락과 흉터·감염 위험이 커집니다. 청결 유지, 자극 회피, 이상 시 의료기관 방문이 올바른 안내입니다.',
  },

  // ───────────────────────── 법규·면허 ─────────────────────────
  {
    id: 'law-001',
    subject: 'law',
    question: '무면허(자격 없는 자)의 문신 시술에 대한 일반 원칙으로 옳은 것은?',
    choices: [
      '누구나 자유롭게 시술할 수 있다',
      '면허·자격을 갖춘 자만 시술할 수 있다',
      '미용실에서는 누구나 가능하다',
      '온라인 교육만 들으면 가능하다',
    ],
    answer: 1,
    explanation:
      '면허·자격제도의 핵심은 자격을 갖춘 자만 시술을 하도록 하여 공중위생과 이용자 안전을 보호하는 데 있습니다. 무자격 시술은 금지됩니다.',
  },
  {
    id: 'law-002',
    subject: 'law',
    question: '미성년자에 대한 시술에서 시술자가 가장 우선적으로 고려해야 할 사항은?',
    choices: [
      '시술 가격 흥정',
      '미성년자 보호를 위한 제한과 보호자 관련 규정 준수',
      '대기 인원 수',
      '색소 재고',
    ],
    answer: 1,
    explanation:
      '미성년자는 특별한 보호 대상으로, 관련 법령상의 제한과 보호자 동의 등 규정을 준수해야 합니다. 이용자 보호가 최우선 고려사항입니다.',
  },
  {
    id: 'law-003',
    subject: 'law',
    question: '시술 전 이용자에게 받는 “시술 동의서”의 주된 목적으로 옳은 것은?',
    choices: [
      '시술자의 책임을 모두 면제하기 위함',
      '시술 내용·위험·주의사항을 설명하고 이용자의 이해와 동의를 확인하기 위함',
      '광고에 활용하기 위함',
      '가격을 높이기 위함',
    ],
    answer: 1,
    explanation:
      '동의서는 시술 내용과 부작용·주의사항을 충분히 설명(설명의무)하고 이용자의 동의를 문서로 확인하는 절차입니다. 동의서가 모든 책임을 면제해 주지는 않습니다.',
  },
  {
    id: 'law-004',
    subject: 'law',
    question: '시술 관련 기록(동의서·시술 내역 등)의 관리로 가장 적절한 것은?',
    choices: [
      '기록을 남기지 않는다',
      '일정 기간 안전하게 보관하고 개인정보를 보호한다',
      '누구나 열람하도록 공개한다',
      '시술 직후 즉시 파기한다',
    ],
    answer: 1,
    explanation:
      '시술 기록은 분쟁·위생 관리에 대비해 일정 기간 보관하되, 개인정보 보호 원칙에 따라 안전하게 관리해야 합니다.',
  },
  {
    id: 'law-005',
    subject: 'law',
    question: '문신사 면허제도 도입의 주된 취지로 가장 알맞은 것은?',
    choices: [
      '시술 가격을 통일하기 위해',
      '공중위생 향상과 이용자 안전을 확보하기 위해',
      '특정 업체의 독점을 위해',
      '광고를 늘리기 위해',
    ],
    answer: 1,
    explanation:
      '면허제도는 일정 수준의 위생·안전 역량을 갖춘 사람이 시술하도록 하여 공중위생을 향상하고 이용자를 보호하는 데 목적이 있습니다.',
  },
  {
    id: 'law-006',
    subject: 'law',
    question: '위생교육 이수 의무에 대한 설명으로 옳은 것은?',
    choices: [
      '한 번도 받을 필요가 없다',
      '시술자는 위생·안전에 관한 교육을 이수해야 한다',
      '교육은 시술과 관련이 없다',
      '교육 이수 여부는 비밀이다',
    ],
    answer: 1,
    explanation:
      '시술자는 감염 예방과 안전한 시술을 위해 위생·안전 교육을 이수하도록 하는 것이 일반적입니다. 지속적인 교육은 공중위생 유지의 토대입니다.',
  },
  {
    id: 'law-007',
    subject: 'law',
    question: '영업소(업소)의 위생기준에 관한 설명으로 옳지 않은 것은?',
    choices: [
      '시술 공간을 청결하게 유지해야 한다',
      '멸균·소독 설비를 적절히 갖춰야 한다',
      '위생기준은 권고일 뿐 지키지 않아도 된다',
      '폐기물을 규정에 맞게 처리해야 한다',
    ],
    answer: 2,
    explanation:
      '영업소 위생기준은 준수해야 하는 의무 사항이며, 위반 시 행정처분의 대상이 될 수 있습니다. 청결 유지·소독설비·폐기물 처리는 기본 요건입니다.',
  },
  {
    id: 'law-008',
    subject: 'law',
    question: '시술과 관련해 감염병 등 보건상 위해가 의심될 때 시술자의 바람직한 태도는?',
    choices: [
      '숨기고 계속 영업한다',
      '관련 규정에 따라 신고·조치하고 협조한다',
      '손님 탓으로 돌린다',
      '영업장을 옮긴다',
    ],
    answer: 1,
    explanation:
      '보건상 위해가 의심되면 관련 규정에 따라 신고하고 방역·조사에 협조하는 것이 공중보건을 위한 올바른 태도입니다.',
  },
  {
    id: 'law-009',
    subject: 'law',
    question: '면허 결격사유로 일반적으로 고려될 수 있는 사항과 가장 거리가 먼 것은?',
    choices: [
      '시술 안전을 해칠 수 있는 일정한 건강·법적 사유',
      '관련 법령 위반 이력',
      '선호하는 시술 스타일',
      '면허 취소 후 일정 기간 미경과',
    ],
    answer: 2,
    explanation:
      '결격사유는 이용자 안전·공중위생과 관련된 객관적 사유를 기준으로 합니다. 개인의 시술 스타일·취향은 결격사유와 무관합니다.',
  },
  {
    id: 'law-010',
    subject: 'law',
    question: '위생·안전 의무를 중대하게 위반한 경우 받을 수 있는 조치로 옳은 것은?',
    choices: [
      '아무런 제재가 없다',
      '시정명령·영업정지·면허정지/취소 등 행정처분',
      '오히려 포상을 받는다',
      '광고 우선권을 얻는다',
    ],
    answer: 1,
    explanation:
      '위생·안전 의무 위반은 위반 정도에 따라 시정명령, 영업정지, 면허정지·취소 등 행정처분의 대상이 될 수 있습니다.',
  },

  // ───────────────────────── 색소·염료·재료 ─────────────────────────
  {
    id: 'ink-001',
    subject: 'ink_material',
    question: '문신 색소 중 상대적으로 알레르기 반응 보고가 많은 것으로 알려진 색은?',
    choices: ['검정(black)', '적색(red) 계열', '흰색(white)', '파랑(blue)'],
    answer: 1,
    explanation:
      '적색 계열 색소는 다른 색에 비해 지연성 알레르기 반응(가려움·발진·결절) 보고가 상대적으로 많은 것으로 알려져 있습니다.',
  },
  {
    id: 'ink-002',
    subject: 'ink_material',
    question: '문신 색소의 보관 방법으로 옳은 것은?',
    choices: [
      '직사광선이 드는 창가에 둔다',
      '밀폐하여 직사광선을 피해 보관한다',
      '뚜껑을 열어 통풍시킨다',
      '냉동실에 얼려 보관한다',
    ],
    answer: 1,
    explanation:
      '색소는 밀폐 용기에 담아 직사광선과 고온을 피해 보관합니다. 개봉·오염된 색소는 변질·오염 위험이 있어 관리에 주의해야 합니다.',
  },
  {
    id: 'ink-003',
    subject: 'ink_material',
    question: '시술에 사용하는 색소를 선택·관리할 때 우선 확인해야 할 것은?',
    choices: [
      '가격이 가장 싼지',
      '성분·안전성 정보(MSDS 등)와 사용기한',
      '용기 색깔',
      '브랜드 인지도만',
    ],
    answer: 1,
    explanation:
      '색소는 성분·안전성 정보와 사용기한을 확인하고, 유해성분이 없는 검증된 제품을 사용해야 합니다. 가격·외관보다 안전성이 우선입니다.',
  },
  {
    id: 'ink-004',
    subject: 'ink_material',
    question: '잉크 캡(잉크 컵)의 올바른 사용으로 옳은 것은?',
    choices: [
      '한 번 쓴 캡을 다음 손님에게 다시 쓴다',
      '손님마다 새 일회용 캡을 사용하고 남은 잉크는 폐기한다',
      '여러 명분을 미리 따라 두고 공용으로 쓴다',
      '캡 없이 통째로 바늘을 담근다',
    ],
    answer: 1,
    explanation:
      '잉크 캡은 손님마다 새 일회용을 사용하고, 시술 후 남은 잉크는 오염 위험 때문에 다시 병에 붓지 않고 폐기합니다.',
  },
  {
    id: 'ink-005',
    subject: 'ink_material',
    question: '문신 바늘의 종류에 대한 설명으로 옳은 것은?',
    choices: [
      '라이너(liner)는 면을 채울 때만 쓴다',
      '셰이더(shader)는 주로 선을 그릴 때만 쓴다',
      '라이너는 주로 선, 셰이더(매그)는 주로 면 채움에 사용한다',
      '바늘 종류는 결과에 영향을 주지 않는다',
    ],
    answer: 2,
    explanation:
      '라이너는 주로 외곽선(라인), 셰이더·매그넘은 면 채움·음영(셰이딩)에 사용합니다. 목적에 맞는 바늘 선택이 중요합니다.',
  },
  {
    id: 'ink-006',
    subject: 'ink_material',
    question: '멸균 일회용 카트리지(바늘)를 사용하는 가장 큰 이유는?',
    choices: [
      '비용 절감',
      '교차오염·감염 예방',
      '시술 속도 향상만을 위해',
      '디자인을 위해',
    ],
    answer: 1,
    explanation:
      '멸균 일회용 카트리지는 손님 간 교차오염과 혈액매개 감염을 예방하기 위한 것입니다. 개봉 후 멸균 표시·유효기간을 확인해야 합니다.',
  },
  {
    id: 'ink-007',
    subject: 'ink_material',
    question: '시술 중 손님에게 알레르기·이상반응이 나타날 때 가장 적절한 대응은?',
    choices: [
      '무시하고 시술을 계속한다',
      '시술을 중단하고 필요 시 의료기관 진료를 권한다',
      '색소를 더 진하게 넣는다',
      '손님에게 참으라고 한다',
    ],
    answer: 1,
    explanation:
      '이상반응이 나타나면 즉시 시술을 중단하고 상태를 확인하며, 필요 시 의료기관 진료를 안내해야 합니다.',
  },
  {
    id: 'ink-008',
    subject: 'ink_material',
    question: '문신 색소와 관련해 우려되는 유해 성분으로 거론되는 것은?',
    choices: ['비타민C', '일부 중금속·유해 색소 성분', '정제수', '식용 소금'],
    answer: 1,
    explanation:
      '일부 색소에서 중금속이나 유해 색소 성분이 문제로 거론됩니다. 그래서 성분이 검증된 안전한 색소를 선택하는 것이 중요합니다.',
  },
  {
    id: 'ink-009',
    subject: 'ink_material',
    question: '시술 기구·재료의 일회용/재사용 구분으로 옳은 것은?',
    choices: [
      '바늘은 소독만 하면 재사용해도 된다',
      '바늘·잉크 캡 등 일회용 품목은 재사용하지 않는다',
      '장갑은 빨아서 다시 쓴다',
      '면도날은 여러 손님에게 쓴다',
    ],
    answer: 1,
    explanation:
      '바늘·잉크 캡·면도날·장갑 등 일회용 품목은 절대 재사용하지 않습니다. 재사용은 감염의 직접 원인이 됩니다.',
  },

  // ───────────────────────── 기초 해부·피부학 ─────────────────────────
  {
    id: 'anatomy-001',
    subject: 'anatomy',
    question: '피부의 구조를 바깥에서 안쪽 순서로 바르게 나열한 것은?',
    choices: [
      '진피 → 표피 → 피하조직',
      '표피 → 진피 → 피하조직',
      '피하조직 → 진피 → 표피',
      '표피 → 피하조직 → 진피',
    ],
    answer: 1,
    explanation:
      '피부는 바깥쪽부터 표피(epidermis) → 진피(dermis) → 피하조직(subcutis) 순서로 이루어져 있습니다.',
  },
  {
    id: 'anatomy-002',
    subject: 'anatomy',
    question: '문신 색소가 안정적으로 안착(유지)되는 피부 층은?',
    choices: ['표피', '진피', '피하지방층', '각질층'],
    answer: 1,
    explanation:
      '색소는 진피(dermis)에 안착되어야 오래 유지됩니다. 표피는 계속 탈락·재생되므로 표피에만 색소가 들어가면 색이 빠집니다.',
  },
  {
    id: 'anatomy-003',
    subject: 'anatomy',
    question: '표피에 존재하며 피부색을 결정하는 색소를 만드는 세포는?',
    choices: ['멜라닌세포(멜라노사이트)', '적혈구', '섬유아세포', '지방세포'],
    answer: 0,
    explanation:
      '표피의 멜라닌세포(멜라노사이트)가 멜라닌 색소를 생성해 피부색과 자외선 방어에 관여합니다.',
  },
  {
    id: 'anatomy-004',
    subject: 'anatomy',
    question: '진피층에 주로 분포하는 구성요소로 옳은 것은?',
    choices: [
      '각질만 존재한다',
      '콜라겐·탄력섬유, 혈관, 신경 등이 분포한다',
      '아무 구조도 없다',
      '오직 지방만 있다',
    ],
    answer: 1,
    explanation:
      '진피에는 콜라겐·탄력섬유와 혈관, 신경, 피부 부속기관이 분포합니다. 그래서 진피 시술 시 출혈과 통증이 동반될 수 있습니다.',
  },
  {
    id: 'anatomy-005',
    subject: 'anatomy',
    question: '상처(피부 손상) 치유 과정의 일반적 순서로 옳은 것은?',
    choices: [
      '성숙기 → 증식기 → 염증기',
      '염증기 → 증식기 → 성숙(재형성)기',
      '증식기 → 염증기 → 성숙기',
      '염증기 → 성숙기 → 증식기',
    ],
    answer: 1,
    explanation:
      '상처 치유는 염증기 → 증식기(육아조직·재상피화) → 성숙(재형성)기 순으로 진행됩니다. 문신 부위의 회복도 이 과정을 따릅니다.',
  },
  {
    id: 'anatomy-006',
    subject: 'anatomy',
    question: '켈로이드(keloid)에 대한 설명으로 옳은 것은?',
    choices: [
      '상처보다 작게 아무는 흉터이다',
      '원래 상처 범위를 넘어 과하게 자라는 흉터로 체질 영향을 받는다',
      '모든 사람에게 동일하게 생긴다',
      '색소 알레르기의 다른 이름이다',
    ],
    answer: 1,
    explanation:
      '켈로이드는 상처 범위를 넘어 과증식하는 흉터로, 체질적 소인의 영향을 받습니다. 켈로이드 경향이 있는 사람은 시술에 특히 주의가 필요합니다.',
  },
  {
    id: 'anatomy-007',
    subject: 'anatomy',
    question: '문신 후 표피가 정상적으로 재생·탈락하는데도 색이 유지되는 이유는?',
    choices: [
      '색소가 표피에만 머물러서',
      '색소가 진피에 안착되어 표피 재생과 무관하게 남기 때문',
      '색소가 혈관을 타고 순환해서',
      '색소가 각질에 흡착되어서',
    ],
    answer: 1,
    explanation:
      '색소가 진피에 자리 잡으면 표피가 주기적으로 재생·탈락해도 색이 남습니다. 적절한 깊이로 진피에 안착시키는 것이 관건입니다.',
  },
  {
    id: 'anatomy-008',
    subject: 'anatomy',
    question: '시술 깊이가 너무 깊을 때 발생하기 쉬운 문제로 옳은 것은?',
    choices: [
      '색이 전혀 들어가지 않는다',
      '색번짐(블로우아웃)·과도한 손상·흉터 위험이 커진다',
      '통증이 전혀 없다',
      '회복이 더 빨라진다',
    ],
    answer: 1,
    explanation:
      '너무 깊게 시술하면 색소가 번지는 블로우아웃, 조직 손상과 흉터, 회복 지연 등이 생길 수 있습니다. 반대로 너무 얕으면 색이 빠집니다.',
  },
  {
    id: 'anatomy-009',
    subject: 'anatomy',
    question: '피하조직(subcutis)의 주된 기능과 거리가 먼 것은?',
    choices: ['단열·체온 유지', '충격 완화(쿠션)', '에너지(지방) 저장', '문신 색소의 주된 안착 층'],
    answer: 3,
    explanation:
      '피하조직은 지방으로 이루어져 단열·완충·에너지 저장 기능을 합니다. 문신 색소가 안착되는 층은 피하조직이 아니라 진피입니다.',
  },
]

/** 수록(seed) + 자동 생성(검증 통과) 문항 통합 은행 */
export const QUESTIONS: Question[] = [...SEED_QUESTIONS, ...GENERATED_QUESTIONS]

export function getQuestionsBySubject(subject: SubjectKey): Question[] {
  return QUESTIONS.filter((q) => q.subject === subject)
}

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id)
}

export function getSubjectCount(subject: SubjectKey): number {
  return getQuestionsBySubject(subject).length
}

/**
 * 기존 수록 문항의 난이도·세부항목(topic) 태그.
 * (AI 생성 문항은 Question 객체에 difficulty/topic을 직접 담는다.)
 */
export const QUESTION_META: Record<string, { difficulty: QuestionDifficulty; topic: string }> = {
  // 위생·감염 관리
  'hygiene-001': { difficulty: 1, topic: 'hygiene.disinfection' },
  'hygiene-002': { difficulty: 1, topic: 'hygiene.disinfection' },
  'hygiene-003': { difficulty: 1, topic: 'hygiene.environment' },
  'hygiene-004': { difficulty: 1, topic: 'hygiene.bbp' },
  'hygiene-005': { difficulty: 2, topic: 'hygiene.disinfection' },
  'hygiene-006': { difficulty: 2, topic: 'hygiene.infection' },
  'hygiene-007': { difficulty: 2, topic: 'hygiene.disinfection' },
  'hygiene-008': { difficulty: 2, topic: 'hygiene.disinfection' },
  'hygiene-009': { difficulty: 2, topic: 'hygiene.infection' },
  'hygiene-010': { difficulty: 2, topic: 'hygiene.infection' },
  'hygiene-011': { difficulty: 3, topic: 'hygiene.disinfection' },
  'hygiene-012': { difficulty: 2, topic: 'hygiene.infection' },
  // 법규·면허
  'law-001': { difficulty: 1, topic: 'law.tattoo_law' },
  'law-002': { difficulty: 2, topic: 'law.tattoo_law' },
  'law-003': { difficulty: 2, topic: 'law.consent_record' },
  'law-004': { difficulty: 2, topic: 'law.consent_record' },
  'law-005': { difficulty: 1, topic: 'law.tattoo_law' },
  'law-006': { difficulty: 2, topic: 'law.sanitation_law' },
  'law-007': { difficulty: 2, topic: 'law.sanitation_law' },
  'law-008': { difficulty: 2, topic: 'law.sanitation_law' },
  'law-009': { difficulty: 3, topic: 'law.tattoo_law' },
  'law-010': { difficulty: 2, topic: 'law.sanitation_law' },
  // 색소·염료·재료
  'ink-001': { difficulty: 2, topic: 'ink.pigment_safety' },
  'ink-002': { difficulty: 1, topic: 'ink.storage' },
  'ink-003': { difficulty: 2, topic: 'ink.pigment_safety' },
  'ink-004': { difficulty: 1, topic: 'ink.tools' },
  'ink-005': { difficulty: 2, topic: 'ink.tools' },
  'ink-006': { difficulty: 2, topic: 'ink.tools' },
  'ink-007': { difficulty: 2, topic: 'ink.pigment_safety' },
  'ink-008': { difficulty: 3, topic: 'ink.pigment_safety' },
  'ink-009': { difficulty: 1, topic: 'ink.tools' },
  // 기초 해부·피부학
  'anatomy-001': { difficulty: 1, topic: 'anatomy.skin_structure' },
  'anatomy-002': { difficulty: 1, topic: 'anatomy.skin_structure' },
  'anatomy-003': { difficulty: 1, topic: 'anatomy.skin_structure' },
  'anatomy-004': { difficulty: 2, topic: 'anatomy.skin_structure' },
  'anatomy-005': { difficulty: 2, topic: 'anatomy.wound' },
  'anatomy-006': { difficulty: 2, topic: 'anatomy.wound' },
  'anatomy-007': { difficulty: 2, topic: 'anatomy.skin_structure' },
  'anatomy-008': { difficulty: 3, topic: 'anatomy.skin_structure' },
  'anatomy-009': { difficulty: 1, topic: 'anatomy.skin_appendage' },
}

/** 문항 난이도(하1·중2·상3). 인라인 → META → 기본 2 순으로 해석 */
export function getDifficulty(id: string): QuestionDifficulty {
  const q = getQuestionById(id)
  if (q?.difficulty) return q.difficulty
  return QUESTION_META[id]?.difficulty ?? 2
}

/** 문항의 blueprint 세부항목(topic) 키 */
export function getTopicKey(id: string): string | undefined {
  const q = getQuestionById(id)
  return q?.topic ?? QUESTION_META[id]?.topic
}
