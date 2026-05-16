// @client-reason: Interactive profile form with state management
"use client";
import { STRINGS } from "@/lib/strings";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
/* eslint-disable max-lines-per-function, complexity, sonarjs/cognitive-complexity */

import { useState, useEffect } from "react";
import { FullPageSpinner } from "@/components/ui/full-page-spinner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Camera, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { updatePassword } from "@/lib/supabase/auth-client";
import { getAvatarUrl } from "@/lib/supabase/storage-utils";
import { optimizeImage } from "@/lib/utils/image-optimizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function ProfileClient(): React.ReactElement {
  const router = useRouter();
  const { user, artist, isArtist, isLoading, logout } = useAuth();

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [chatNotification, setChatNotification] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.user_metadata?.nickname || "");
      setEmail(user.email || "");
      setContact(user.user_metadata?.contact || "");
      setChatNotification(user.user_metadata?.message_push_enabled !== false);

      if (artist?.profile_image_path) {
        setProfileImage(getAvatarUrl(artist.profile_image_path));
      } else if (user.user_metadata?.avatar_url) {
        setProfileImage(user.user_metadata.avatar_url as string);
      }
    }
  }, [user, artist]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (): void => {
    setProfileImage(null);
    setNewImageFile(null);
  };

  const handleWithdraw = async (): Promise<void> => {
    const message = isArtist
      ? `${STRINGS.mypage.withdrawConfirm}\n${STRINGS.mypage.withdrawArtistWarning}`
      : STRINGS.mypage.withdrawConfirm;

    if (!globalThis.confirm(message)) {
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.rpc("delete_user_account");

    if (error) {
      globalThis.alert(`Error: ${error.message}`);
      return;
    }

    globalThis.alert(
      `${STRINGS.mypage.withdrawSuccess}\n${STRINGS.mypage.withdrawThanks}`
    );
    await logout();
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const nicknameRegex = /^[가-힣A-Za-z0-9_]{2,12}$/;
    if (!nicknameRegex.test(nickname)) {
      globalThis.alert("닉네임은 한글, 영문, 숫자, 밑줄만 사용 가능합니다 (2-12자)");
      return;
    }

    if (password && password !== passwordConfirm) {
      globalThis.alert(STRINGS.auth.passwordMismatch);
      return;
    }

    if (password && password.length < PASSWORD_MIN_LENGTH) {
      globalThis.alert(`비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`);
      return;
    }

    if (password && !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      globalThis.alert("비밀번호에 영문과 숫자를 모두 포함해주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const supabase = createClient();

      // Update user metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          nickname,
          contact,
          message_push_enabled: chatNotification,
        },
      });

      if (updateError) {
        throw updateError;
      }

      // Update password if provided
      if (password) {
        const { error: passwordError } = await updatePassword(password);
        if (passwordError) {
          const isWeak = passwordError.message.includes("weak") || passwordError.message.includes("easy to guess");
          globalThis.alert(isWeak ? "비밀번호가 너무 약합니다. 영문+숫자+특수문자를 포함한 8자 이상의 비밀번호를 사용해주세요." : passwordError.message);
          return;
        }
      }

      // Upload new profile image if selected (optimized to WebP)
      if (newImageFile) {
        // Optimize image: resize to 400x400 max, convert to WebP, 85% quality
        const optimizedBlob = await optimizeImage(newImageFile, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.85,
        });

        const fileName = `${user?.id}/profile.webp`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, optimizedBlob, {
            upsert: true,
            contentType: "image/webp",
          });

        if (uploadError) {
          // eslint-disable-next-line no-console -- Log upload errors for debugging
          console.error("Upload error:", uploadError);
        } else {
          const avatarFullUrl = `${(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()}/storage/v1/object/public/avatars/${fileName}`;

          // Update user metadata
          await supabase.auth.updateUser({
            data: { avatar_url: avatarFullUrl },
          });

          // Also update artist profile_image_path if user is an artist
          if (isArtist && artist?.id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase type inference issue
            await (supabase.from("artists") as any)
              .update({ profile_image_path: fileName })
              .eq("id", artist.id);
          }
        }
      }

      globalThis.alert(STRINGS.mypage.saved);
      router.push("/mypage");
    } catch (error) {
      // eslint-disable-next-line no-console -- Log update errors for debugging
      console.error("Update error:", error);
      globalThis.alert(STRINGS.common.error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (!user) {
    return <div />;
  }

  const username = user.user_metadata?.username || user.email?.split("@")[0] || user.id.slice(0, 8);

  return (
    <div className="mx-auto min-h-screen w-full max-w-[767px] bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center border-b bg-background px-4">
        <Link
          href={"/mypage"}
          className="flex items-center justify-center rounded-lg p-2 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="ml-2 text-lg font-semibold">{STRINGS.mypage.editProfile}</h1>
      </header>

      <form onSubmit={handleSubmit} className="pb-28">
        <div className="space-y-6 p-4">
          {/* Username (Read-only) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{STRINGS.mypage.username}</Label>
            <Input
              type="text"
              value={username}
              readOnly
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              {STRINGS.mypage.usernameReadonly}
            </p>
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {STRINGS.mypage.nickname} <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={STRINGS.mypage.nicknamePlaceholder}
            />
          </div>

          {/* Profile Image */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{STRINGS.mypage.profileImage}</Label>
              <span className="text-xs text-muted-foreground">
                {profileImage ? "1" : "0"} / 1
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30">
                  {profileImage ? (
                    <Image
                      src={profileImage}
                      alt="Profile"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {profileImage && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    aria-label="프로필 이미지 삭제"
                    className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 focus-visible:bg-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <label className="cursor-pointer rounded-lg border px-4 py-2 text-sm transition-colors hover:bg-muted focus-visible:bg-muted focus-within:bg-muted">
                {profileImage ? STRINGS.common.change : STRINGS.common.select}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{STRINGS.mypage.password}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={STRINGS.mypage.passwordPlaceholder}
            />
            <p className="text-xs text-muted-foreground">
              {STRINGS.mypage.passwordHint}
            </p>
          </div>

          {/* Password Confirm */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{STRINGS.mypage.passwordConfirm}</Label>
            <Input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder={STRINGS.mypage.passwordConfirmPlaceholder}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {STRINGS.mypage.emailAddress} <span className="text-red-500">*</span>
            </Label>
            <Input
              type="email"
              value={email}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{STRINGS.mypage.contact}</Label>
            <Input
              type="tel"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder={STRINGS.mypage.contactPlaceholder}
            />
          </div>

          {/* Chat Notification */}
          <div className="flex items-center justify-between py-2">
            <Label className="text-sm font-medium">{STRINGS.mypage.chatNotification}</Label>
            <Switch
              checked={chatNotification}
              onCheckedChange={setChatNotification}
            />
          </div>
        </div>

        {/* Withdraw */}
        <div className="mt-8 border-t px-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleWithdraw}
            className="w-full border-red-500/50 py-6 text-base font-semibold text-red-500 hover:bg-red-500/10 hover:text-red-600 focus-visible:bg-red-500/10 focus-visible:text-red-600"
          >
            {STRINGS.mypage.withdraw}
          </Button>
        </div>
      </form>

      {/* Footer Save Button */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background p-4">
        <div className="mx-auto max-w-[767px]">
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSaving}
            className="w-full bg-brand-primary py-6 text-base font-semibold text-white hover:bg-brand-primary-hover focus-visible:bg-brand-primary-hover"
          >
            {isSaving ? STRINGS.common.loading : STRINGS.mypage.save}
          </Button>
        </div>
      </footer>
    </div>
  );
}
