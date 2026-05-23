/**
 * Portfolio 비즈니스 로직 헬퍼 (pure functions only).
 * Client / Server 양쪽에서 안전하게 import 가능.
 * Supabase·DOM·storage 등 사이드 이펙트가 필요한 함수는 components/portfolio-form/portfolio-helpers.ts 에 분리.
 */

export function calcDiscountRate(priceNum: number, priceOriginNum: number): number {
    return priceOriginNum > 0
        ? Math.max(0, Math.round(((priceOriginNum - priceNum) / priceOriginNum) * 100))
        : 0;
}
