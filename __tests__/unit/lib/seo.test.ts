import { describe, it, expect } from "vitest";
import {
  getCanonicalUrl,
  getAlternates,
  getWebsiteJsonLd,
  getArtistJsonLd,
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
      url: "https://howtattoo.com/artists/1",
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
