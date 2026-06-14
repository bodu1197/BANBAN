// @client-reason: 다단계 등록 위저드 — 단계 상태·파일 업로드·주소검색·서버액션 호출(브라우저 인터랙션)
"use client";
// 사유: 4단계 위저드 오케스트레이터 — 단계별 조건부 렌더 4블록 + 상태 배선이 한 컴포넌트에 모여
// 80줄을 넘는다. 단계 본문은 이미 별도 컴포넌트(ShopInfoStep/ImagesStep/PortfolioStep/CompleteStep/
// WizardFooter)로 분리했고, 남은 것은 상태·핸들러 배선이라 추가 분할은 과도한 prop drilling 만 유발.
/* eslint-disable max-lines-per-function */
import { STRINGS } from "@/lib/strings";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useDaumPostcode } from "@/hooks/useDaumPostcode";
import { createClient } from "@/lib/supabase/client";

import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { INITIAL_FORM_DATA } from "@/types/artist-form";
import { addressToRegionKey } from "@/lib/regions";
import type { ArtistFormData, ArtistFormCategory } from "@/types/artist-form";
import { useArtistFormHandlers, useArtistCategories, buildFormLabelsFromDict, DaumPostcodeModal } from "@/components/artist-form/ArtistFormFields";
import { INTRODUCE_MIN_LENGTH } from "@/components/artist-form/GuidedIntroduce";
import { publishShop } from "@/lib/actions/shop-review";
import { OnboardingStepper, type OnboardingStep } from "./components/OnboardingStepper";
import { ShopInfoStep } from "./components/ShopInfoStep";
import { ImagesStep } from "./components/ImagesStep";
import { PortfolioStep } from "./components/PortfolioStep";
import { CompleteStep } from "./components/CompleteStep";
import { WizardFooter } from "./components/WizardFooter";
import { registerShop } from "./components/register-helpers";

/** 논스톱 등록에서 다음 단계로 진행하기 위한 최소 작품 수. 2026-06-15: 3 → 1(작품 1개면 진행·공개). */
const MIN_ONBOARDING_PORTFOLIOS = 1;

const WIZARD_STEPS: readonly OnboardingStep[] = [
  { id: 1, label: "샵정보" },
  { id: 2, label: "이미지" },
  { id: 3, label: "포폴" },
  { id: 4, label: "완료" },
];

// 받침 유무로 목적격 조사(을/를) 선택 — 한국어 전용 서비스.
function eulReul(word: string): "을" | "를" {
  const code = word.charCodeAt(word.length - 1);
  if (code < 0xac00 || code > 0xd7a3) return "을";
  return (code - 0xac00) % 28 === 0 ? "를" : "을";
}

function validateShopInfo(formData: ArtistFormData, t: typeof STRINGS.artistRegister): string | null {
  if (!formData.title.trim()) return `'${t.artistName}'${eulReul(t.artistName)} 입력해 주세요.`;
  if (!formData.contact.trim()) return `'${t.phone}'${eulReul(t.phone)} 입력해 주세요.`;
  if (!formData.address.trim()) return `'${t.address}'${eulReul(t.address)} 입력해 주세요.`;
  if (!formData.region_id) return `'${t.region}' 정보가 없습니다. 주소를 '검색' 버튼으로 다시 선택하면 지역이 자동 설정됩니다.`;
  if (!formData.introduce.trim()) return "소개글을 작성해 주세요.";
  const introduceLen = formData.introduce.trim().length;
  if (introduceLen < INTRODUCE_MIN_LENGTH) {
    return `소개글을 ${String(INTRODUCE_MIN_LENGTH)}자 이상 작성해 주세요. (현재 ${String(introduceLen)}자)`;
  }
  if (!Object.values(formData.business_hours).some(Boolean)) {
    return "영업시간을 최소 1일 이상 설정해 주세요.";
  }
  return null;
}

function validateImages(hasBanner: boolean, hasProfile: boolean): string | null {
  if (!hasBanner) return "대표 배너 이미지를 1장 등록해 주세요.";
  if (!hasProfile) return "'샵 대표 사진'을 1장 등록해 주세요.";
  return null;
}

interface ArtistRegisterClientProps {
  categories: ArtistFormCategory[];
}

export function ArtistRegisterClient({ categories }: Readonly<ArtistRegisterClientProps>): React.ReactElement {
  const router = useRouter();
  const { user, isLoading: authLoading, hasShop, refresh } = useAuth();
  const { isOpen: isAddressOpen, open: openAddress, close: closeAddress } = useDaumPostcode();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<ArtistFormData>(INITIAL_FORM_DATA);
  const [bannerImage, setBannerImage] = useState<File[]>([]);
  const [profileImage, setProfileImage] = useState<File[]>([]);
  const [createdArtistId, setCreatedArtistId] = useState<string | null>(null);
  const [addedPreviews, setAddedPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [published, setPublished] = useState(false);

  const t = STRINGS.artistRegister;
  const { handleInputChange, handleBlurNormalize, handleCheckboxChange } = useArtistFormHandlers(setFormData);
  const { shopCategories } = useArtistCategories(categories);

  // 미인증 → 로그인. 이미 샵이 있고(이번 플로우에서 만든 게 아니면) → 중복 등록 차단(마이페이지).
  // createdArtistId 가 있으면 우리가 방금 만든 것이라 hasShop 이 true 여도 되돌리지 않는다.
  useEffect(() => {
    if (authLoading) return;
    if (!user) { globalThis.location.href = "/login"; return; }
    if (hasShop && !createdArtistId) {
      globalThis.alert("이미 아티스트로 등록되어 있습니다.");
      router.push("/mypage");
    }
  }, [authLoading, user, hasShop, createdArtistId, router]);

  // 위저드 이탈/완료(언마운트) 시 누적된 작품 미리보기 blob URL 일괄 해제(메모리 누수 방지).
  // ref 로 최신 목록 추적 + [] deps → 썸네일 표시 중엔 살아있고 언마운트에서만 revoke.
  const addedPreviewsRef = useRef<string[]>([]);
  addedPreviewsRef.current = addedPreviews;
  useEffect(() => () => {
    addedPreviewsRef.current.forEach((u) => { if (u.startsWith("blob:")) URL.revokeObjectURL(u); });
  }, []);

  const handleAddressSearch = async (): Promise<void> => {
    const result = await openAddress();
    if (!result) return;
    setFormData((prev) => ({ ...prev, zipcode: result.zonecode, address: result.address }));
    const regionKey = addressToRegionKey(result.address);
    if (!regionKey) return;
    const supabase = createClient();
    const { data } = await supabase.from("regions").select("id, name").eq("name", regionKey).single();
    if (data) setFormData((prev) => ({ ...prev, region_id: data.id as string }));
  };

  async function goToImages(): Promise<void> {
    const error = validateShopInfo(formData, t);
    if (error) { globalThis.alert(error); return; }
    // 샵 이름 중복 사전 확인 — 이미지 업로드 전에 빠르게 막는다(최종 차단은 등록 POST).
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/artist-register?name=${encodeURIComponent(formData.title.trim())}`);
      const data = await res.json().catch(() => ({ available: true })) as { available?: boolean };
      if (data.available === false) {
        globalThis.alert("이미 사용 중인 샵 이름이에요. 다른 이름을 입력해 주세요.");
        return;
      }
    } catch {
      /* 네트워크 오류 시 통과 — 등록 단계에서 최종 차단됨 */
    } finally {
      setIsProcessing(false);
    }
    setStep(2);
  }

  async function createShopAndContinue(): Promise<void> {
    const error = validateImages(bannerImage.length > 0, profileImage.length > 0);
    if (error) { globalThis.alert(error); return; }
    if (!user) { router.push("/login"); return; }

    setIsProcessing(true);
    try {
      const result = await registerShop({ formData, bannerFile: bannerImage[0], profileFile: profileImage[0] });
      if (result.status === "exists") {
        globalThis.alert("이미 아티스트로 등록되어 있습니다.");
        router.push("/mypage");
        return;
      }
      if (result.status === "duplicate_name") {
        globalThis.alert("이미 사용 중인 샵 이름이에요. 1단계로 돌아가 다른 이름을 입력해 주세요.");
        setStep(1);
        return;
      }
      if (result.status === "error") {
        globalThis.alert(STRINGS.common.error);
        return;
      }
      setCreatedArtistId(result.artistId);
      setStep(3);
    } catch (err: unknown) {
      // eslint-disable-next-line no-console
      console.error("Registration error:", err);
      globalThis.alert(STRINGS.common.error);
    } finally {
      setIsProcessing(false);
    }
  }

  async function finishOnboarding(): Promise<void> {
    setIsProcessing(true);
    try {
      // 배너+포폴10 충족 시 draft→active 즉시 공개(사전승인 폐지). 미달이면 ok=false(무해, draft 유지).
      const result = await publishShop().catch(() => null);
      setPublished(result?.ok ?? false);
    } finally {
      setIsProcessing(false);
    }
    // 헤더/마이페이지 클라 상태에 artist 역할 반영(createdArtistId 설정 후라 redirect 가드 안전).
    await refresh().catch(() => { /* best-effort */ });
    setStep(4);
  }

  if (authLoading || !user) {
    return <FullPageSpinner />;
  }

  const formLabels = buildFormLabelsFromDict(t);
  const portfolioCount = addedPreviews.length;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[1024px] bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4">
        <Link href={"/mypage"} className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="마이페이지로 나가기">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="ml-2 text-lg font-semibold">{t.title}</h1>
      </header>

      <OnboardingStepper current={step} steps={WIZARD_STEPS} />

      <div className="pb-28">
        {step === 1 ? (
          <ShopInfoStep
            formData={formData}
            t={t}
            formLabels={formLabels}
            shopCategories={shopCategories}
            handleInputChange={handleInputChange}
            handleBlurNormalize={handleBlurNormalize}
            handleCheckboxChange={handleCheckboxChange}
            onAddressSearch={() => void handleAddressSearch()}
            onIntroduceChange={(qa, text) => setFormData((prev) => ({ ...prev, introduce_qa: qa, introduce: text }))}
            onBusinessHoursChange={(hours) => setFormData((prev) => ({ ...prev, business_hours: hours }))}
          />
        ) : null}

        {step === 2 ? (
          <ImagesStep
            shopName={formData.title}
            t={t}
            bannerCount={bannerImage.length}
            profileCount={profileImage.length}
            onBannerChange={(file) => setBannerImage(file ? [file] : [])}
            onProfileChange={setProfileImage}
          />
        ) : null}

        {step === 3 && createdArtistId ? (
          <PortfolioStep
            artistId={createdArtistId}
            typeArtist={formData.type_artist}
            addedPreviews={addedPreviews}
            minRequired={MIN_ONBOARDING_PORTFOLIOS}
            onAdded={(previewUrl) => setAddedPreviews((prev) => [...prev, previewUrl])}
          />
        ) : null}

        {step === 4 ? (
          <CompleteStep published={published} portfolioCount={portfolioCount} />
        ) : null}
      </div>

      <WizardFooter
        step={step}
        isProcessing={isProcessing}
        portfolioCount={portfolioCount}
        minRequired={MIN_ONBOARDING_PORTFOLIOS}
        onPrev={() => setStep(1)}
        onNext={() => void goToImages()}
        onCreate={() => void createShopAndContinue()}
        onFinish={() => void finishOnboarding()}
      />

      <DaumPostcodeModal isOpen={isAddressOpen} onClose={closeAddress} />
    </div>
  );
}
