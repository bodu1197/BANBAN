/**
 * 반언니 브랜드의 외부 공식 채널 — **단일 소스**.
 *
 * 🔒 홈의 앱 다운로드 버튼과 Organization JSON-LD 의 `sameAs` 가 같은 값을 써야 한다.
 *    `sameAs` 는 "이 사이트 = 저 앱스토어 등록 = 저 인스타그램" 을 검색엔진에 잇는 유일한 선언이다.
 *    2026-09-07 실측: 구글 '반언니' 검색 1페이지가 플레이스토어·앱스토어·인스타그램으로 채워지고
 *    정작 홈페이지는 뒤로 밀렸다 — 외부 채널과 사이트가 같은 브랜드라는 신호가 없었기 때문이다.
 */
export const APP_STORE_URL =
  "https://apps.apple.com/us/app/%EB%B0%98%EC%96%B8%EB%8B%88-%EB%88%88%EC%8D%B9%EB%AC%B8%EC%8B%A0-%EB%B0%98%EC%98%81%EA%B5%AC-%EA%B0%80%EA%B2%A9%EB%B9%84%EA%B5%90-%EB%B0%8F-%EA%B0%84%ED%8E%B8-%EC%98%88%EC%95%BD/id6762251420";
export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.swing2app.v3.da2371fb31eee407fb0e926e1fe9a607e&hl=ko";
export const INSTAGRAM_URL = "https://www.instagram.com/banunnibani/";

export const BRAND_SAME_AS: readonly string[] = [APP_STORE_URL, PLAY_STORE_URL, INSTAGRAM_URL];
