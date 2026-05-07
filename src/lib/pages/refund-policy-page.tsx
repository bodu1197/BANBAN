import type { Metadata } from "next";
import { getAlternates } from "@/lib/seo";

const TITLE = "반품 및 환불 정책";
const DESCRIPTION =
  "반언니 반품 및 환불 정책 안내 — 신청 기간, 반품 불가 사유, 배송비, 환불 처리 절차, 저작권 준수 사항.";

export async function generateRefundPolicyMetadata(): Promise<Metadata> {
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: getAlternates("/refund-policy"),
    openGraph: { title: TITLE, description: DESCRIPTION, type: "article" },
  };
}

// eslint-disable-next-line max-lines-per-function -- single static policy page rendered as one block
export async function renderRefundPolicyPage(): Promise<React.ReactElement> {
  return (
    <main className="container mx-auto flex flex-1 flex-col px-4 py-6">
      <h1 className="mb-2 text-2xl font-bold">반언니 반품 및 환불 정책</h1>
      <p className="mb-6 text-sm text-muted-foreground">Return &amp; Refund Policy</p>

      <article className="space-y-6 rounded-lg border p-6 text-sm leading-relaxed">
        <p>
          반언니는 아티스트의 창작 가치를 존중하며, 고객님께 안전하게 작품을 전달하기 위해 노력하고 있습니다.
          아티스트가 직접 배송하고 관리하는 작품 판매의 특성상, 아래의 반품 규정을 반드시 확인해 주시기 바랍니다.
        </p>

        <section>
          <h2 className="mb-2 text-base font-semibold">1. 반품 및 교환 신청 기간</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>기성 작품(일반 배송 상품):</strong> 상품 수령 후 7일 이내에 고객센터를 통해 신청해 주셔야 합니다.
            </li>
            <li>
              <strong>표시/광고와 다른 경우:</strong> 상품 수령 후 3개월 이내, 혹은 그 사실을 안 날로부터 30일 이내에 신청 가능합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">2. 반품 및 환불이 불가능한 경우</h2>
          <p className="mb-2">아티스트의 저작권과 주문 제작 상품의 특성을 보호하기 위해 아래의 경우 반품이 제한됩니다.</p>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>1:1 주문 제작 작품:</strong> 아티스트가 고객님의 요청에 따라 별도로 제작에 착수한 커스텀 도안 및 작품은 작업 시작 후 취소 및 환불이 불가합니다.
            </li>
            <li>
              <strong>포장 개봉 및 사용:</strong> 보호 필름을 제거했거나, 상품의 포장을 개봉하여 가치가 훼손된 경우.
            </li>
            <li>
              <strong>복제 가능 상품:</strong> 도안의 특성상 상품을 확인한 것만으로도 디자인 복제가 가능하므로, 단순 변심에 의한 개봉 후 반품은 불가합니다.
            </li>
            <li>
              <strong>고객 과실:</strong> 고객님의 부주의로 작품이 오염되거나 훼손된 경우.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">3. 반품 배송비 및 주소 안내</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>
              <strong>반품 주소:</strong> 반언니는 아티스트별로 개별 발송되므로, 반품 주소는 해당 작품을 발송한 아티스트의 작업실 주소로 보내주셔야 합니다. (고객센터 접수 시 상세 주소를 개별 안내해 드립니다.)
            </li>
            <li>
              <strong>단순 변심:</strong> 고객님께서 왕복 배송비를 부담하셔야 합니다.
            </li>
            <li>
              <strong>상품 하자로 인한 반품:</strong> 배송비 전액을 반언니 또는 해당 아티스트가 부담합니다.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">4. 환불 처리</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>반송된 상품이 해당 아티스트에게 도착하여 검수가 완료된 후, 영업일 기준 3~5일 이내에 결제 수단으로 환불됩니다.</li>
            <li>주문 제작 상품의 경우, 제작 진행 단계에 따라 재료비 등을 제외한 부분 환불이 적용될 수 있습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold">5. 저작권 준수 사항</h2>
          <ul className="ml-5 list-disc space-y-1">
            <li>구매하신 모든 도안과 작품의 저작권은 해당 아티스트에게 있으며, 무단 복제, 도용, 상업적 재판매 시 법적 책임을 물을 수 있습니다.</li>
          </ul>
        </section>

        <section className="rounded-md border bg-muted/50 p-4">
          <h2 className="mb-3 text-base font-semibold">📞 반언니 고객지원팀</h2>
          <ul className="space-y-1">
            <li>
              <strong>전화번호:</strong>{" "}
              <a href="tel:01086996664" className="text-brand-primary hover:underline focus-visible:underline focus-visible:outline-none">
                010-8699-6664
              </a>
            </li>
            <li>
              <strong>이메일:</strong>{" "}
              <a href="mailto:howtattoo@banunni.com" className="text-brand-primary hover:underline focus-visible:underline focus-visible:outline-none">
                howtattoo@banunni.com
              </a>
            </li>
            <li>
              <strong>상담시간:</strong> 평일 10:00 ~ 17:00 (주말 및 공휴일 휴무)
            </li>
            <li>
              <strong>반품 접수:</strong> 상품 반송 전 반드시 고객센터나 게시판을 통해 먼저 접수해 주시기 바랍니다.
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
}
