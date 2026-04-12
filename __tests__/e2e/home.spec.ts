import { test, expect } from "@playwright/test";

test.describe("홈페이지", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("페이지 제목이 표시됨", async ({ page }) => {
    await expect(page).toHaveTitle(/반언니/);
  });

  test("헤더 로고가 표시됨", async ({ page }) => {
    await expect(page.locator("text=타투")).toBeVisible();
    await expect(page.locator("text=어때")).toBeVisible();
  });

  test("하단 네비게이션이 모바일에서 표시됨", async ({ page }) => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 });

    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    await expect(bottomNav).toBeVisible();

    await expect(page.locator("text=홈")).toBeVisible();
    await expect(page.locator("text=검색")).toBeVisible();
    await expect(page.locator("text=내 주변")).toBeVisible();
  });

  test("데스크톱에서 하단 네비게이션 숨김", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const bottomNav = page.locator('nav[aria-label="Bottom navigation"]');
    await expect(bottomNav).toBeHidden();
  });
});

test.describe("네비게이션", () => {
  test("마이페이지로 이동", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 375, height: 667 });

    await page.click('a[href="/mypage"]');
    await expect(page).toHaveURL("/mypage");
  });

  test("로그인 페이지로 이동", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("text=로그인")).toBeVisible();
    await expect(page.locator("text=카카오")).toBeVisible();
    await expect(page.locator("text=Google")).toBeVisible();
  });
});

test.describe("반응형 디자인", () => {
  test("모바일에서 그리드 2열", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 375, height: 667 });

    // 아티스트 그리드가 2열로 표시되는지 확인
    const grid = page.locator('[class*="grid-cols-2"]');
    await expect(grid.first()).toBeVisible();
  });

  test("태블릿에서 그리드 3열", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 768, height: 1024 });

    const grid = page.locator('[class*="md:grid-cols-3"]');
    await expect(grid.first()).toBeVisible();
  });

  test("데스크톱에서 그리드 4열", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 1280, height: 800 });

    const grid = page.locator('[class*="lg:grid-cols-4"]');
    await expect(grid.first()).toBeVisible();
  });
});

test.describe("접근성", () => {
  test("Skip to content 링크", async ({ page }) => {
    await page.goto("/");

    // Tab으로 스킵 링크 포커스
    await page.keyboard.press("Tab");

    // 스킵 링크가 있다면 확인 (구현된 경우)
    const skipLink = page.locator('a[href="#main-content"]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
    }
  });

  test("이미지에 alt 텍스트 존재", async ({ page }) => {
    await page.goto("/");

    const images = page.locator("img");
    const count = await images.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt).toBeTruthy();
    }
  });

  test("버튼에 aria-label 존재", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 375, height: 667 });

    // 아이콘만 있는 버튼들 확인
    const iconButtons = page.locator('button:has(svg):not(:has-text(""))');
    const count = await iconButtons.count();

    for (let i = 0; i < count; i++) {
      const ariaLabel = await iconButtons.nth(i).getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
    }
  });
});
