import { describe, it, expect } from "vitest";
import {
  getCanonicalUrl,
  getAlternates,
  getWebsiteJsonLd,
  getArtistJsonLd,
  htmlToPlainText,
  descriptionOrFallback,
  SITE_URL,
  SITE_NAME,
} from "@/lib/seo";

describe("SEO 유틸리티 (한국어 전용)", () => {
  describe("getCanonicalUrl", () => {
    it("경로와 SITE_URL을 결합함", () => {
      const result = getCanonicalUrl("/artists/123");
      expect(result).toBe(`${SITE_URL}/artists/123`);
    });

    it("인수 없이 호출하면 SITE_URL만 반환함", () => {
      const result = getCanonicalUrl();
      expect(result).toBe(SITE_URL);
    });

    it("빈 문자열이면 SITE_URL만 반환함", () => {
      const result = getCanonicalUrl("");
      expect(result).toBe(SITE_URL);
    });

    it("앞에 슬래시가 없는 경로도 정규화함", () => {
      const result = getCanonicalUrl("artists");
      expect(result).toBe(`${SITE_URL}/artists`);
    });
  });

  describe("getAlternates", () => {
    it("canonical만 반환하고 다국어 languages를 포함하지 않음", () => {
      const result = getAlternates("/about");
      expect(result.canonical).toBe(`${SITE_URL}/about`);
      expect((result as Record<string, unknown>).languages).toBeUndefined();
    });

  });

  describe("getWebsiteJsonLd", () => {
    it("WebSite 스키마를 반환함", () => {
      const result = getWebsiteJsonLd();
      expect(result["@context"]).toBe("https://schema.org");
      expect(result["@type"]).toBe("WebSite");
      expect(result.name).toBe(SITE_NAME);
      expect(result.url).toBe(SITE_URL);
    });

    it("SearchAction potentialAction이 포함됨", () => {
      const result = getWebsiteJsonLd();
      const action = result.potentialAction as Record<string, unknown>;
      expect(action["@type"]).toBe("SearchAction");
    });
  });

  describe("getArtistJsonLd", () => {
    const baseArtist = {
      name: "테스트 아티스트",
      description: "소개글",
      address: "서울 강남구",
      url: "https://banunni.com/artists/1",
    };

    it("LocalBusiness 스키마를 반환함", () => {
      const result = getArtistJsonLd(baseArtist);
      expect(result["@context"]).toBe("https://schema.org");
      expect(result["@type"]).toBe("LocalBusiness");
      expect(result.name).toBe("테스트 아티스트");
    });

    it("위도/경도가 있으면 geo를 포함함", () => {
      const result = getArtistJsonLd({
        ...baseArtist,
        latitude: 37.5,
        longitude: 127.0,
      });
      const geo = result.geo as Record<string, unknown>;
      expect(geo["@type"]).toBe("GeoCoordinates");
      expect(geo.latitude).toBe(37.5);
    });

    it("위도/경도가 없으면 geo를 포함하지 않음", () => {
      const result = getArtistJsonLd(baseArtist);
      expect(result.geo).toBeUndefined();
    });

    it("평점과 리뷰 수가 있으면 aggregateRating을 포함함", () => {
      const result = getArtistJsonLd({
        ...baseArtist,
        rating: 4.5,
        reviewCount: 10,
      });
      const rating = result.aggregateRating as Record<string, unknown>;
      expect(rating["@type"]).toBe("AggregateRating");
      expect(rating.ratingValue).toBe(4.5);
      expect(rating.reviewCount).toBe(10);
    });

    it("리뷰 수가 0이면 aggregateRating을 포함하지 않음", () => {
      const result = getArtistJsonLd({
        ...baseArtist,
        rating: 4.5,
        reviewCount: 0,
      });
      expect(result.aggregateRating).toBeUndefined();
    });

    it("이미지가 있으면 image를 포함함", () => {
      const result = getArtistJsonLd({
        ...baseArtist,
        image: "/test.jpg",
      });
      expect(result.image).toBe("/test.jpg");
    });

    it("이미지가 null이면 image를 포함하지 않음", () => {
      const result = getArtistJsonLd({
        ...baseArtist,
        image: null,
      });
      expect(result.image).toBeUndefined();
    });
  });
});

describe("htmlToPlainText / descriptionOrFallback — 레거시 HTML description", () => {
  it("에디터 원문 HTML 태그를 벗겨 사람이 읽는 텍스트만 남긴다", () => {
    const raw = '<p><img alt="3190811017403568772_1494000330.jpg" src="/files/x.jpg">눈썹 <b>반영구</b> 시술</p>';
    expect(htmlToPlainText(raw)).toBe("눈썹 반영구 시술");
  });
 
  it("태그를 벗기면 남는 글자가 없는 경우 fallback 을 쓴다 (161개 작품이 이 상태였다)", () => {
    const imageOnly = '<p><img src="https://x.supabase.co/a.webp"></p><p><img src="b.webp"></p>';
    expect(htmlToPlainText(imageOnly)).toBe("");
    expect(descriptionOrFallback(imageOnly, "대체 설명")).toBe("대체 설명");
  });
 
  it("HTML 엔티티를 원래 문자로 되돌린다", () => {
    expect(htmlToPlainText("A&amp;B &lt;눈썹&gt; &#39;자연&#39; &quot;결&quot;&nbsp;시술")).toBe(
      "A&B <눈썹> '자연' \"결\" 시술",
    );
  });
 
  it("script/style 안의 코드가 본문으로 새지 않는다", () => {
    expect(htmlToPlainText('<style>.a{color:red}</style><script>alert(1)</script>본문')).toBe("본문");
  });
 
  it("블록 태그 경계에서 문장이 붙지 않는다", () => {
    expect(htmlToPlainText("<p>첫줄</p><p>둘째줄</p>")).toBe("첫줄 둘째줄");
  });
 
  it("평문은 그대로 두고 max 로 자른다", () => {
    expect(descriptionOrFallback("자연스러운 눈썹", "fb", 4)).toBe("자연스러운".slice(0, 4));
  });
});

describe("htmlToPlainText — 악성/기형 입력 방어", () => {
  it("범위를 벗어난 숫자 엔티티에 RangeError 로 페이지를 죽이지 않는다", () => {
    // 아티스트가 introduce 에 넣으면 generateMetadata 가 던져 상세 페이지가 통째로 500 이 됐다.
    expect(() => htmlToPlainText("&#99999999;")).not.toThrow();
    expect(htmlToPlainText("눈썹 &#99999999; 시술")).toBe("눈썹 &#99999999; 시술");
    expect(htmlToPlainText("&#xD800;")).toBe("&#xD800;"); // surrogate half
  });

  it("프로토타입 키를 엔티티로 오인하지 않는다", () => {
    expect(htmlToPlainText("&constructor;")).toBe("&constructor;");
    expect(htmlToPlainText("&__proto__;")).toBe("&__proto__;");
  });

  it("아주 긴 입력에서도 즉시 끝난다 (정규식 백트래킹 상한)", () => {
    const started = performance.now();
    htmlToPlainText("<p ".repeat(80_000));
    expect(performance.now() - started).toBeLessThan(1000);
  });
});
