/** 상대 시간 표기(방금 전 / N분 전 / N시간 전 / N일 전 / 날짜). board·community·review 공용. */
export function formatRelativeTime(dateStr: string): string {
  const diff = new Date().getTime() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR");
}
