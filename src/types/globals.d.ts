/**
 * 외부 스크립트로 주입되는 globals (Daum, Swing2App) 의 ambient 타입.
 * 기존 `(globalThis as unknown as {...}).x` 패턴을 typed accessor 로 대체하기 위함.
 */

export {};

interface DaumPostcodeDataLike {
  address: string;
  addressEnglish: string;
  zonecode: string;
  roadAddress: string;
  jibunAddress: string;
  buildingName: string;
}

interface DaumPostcodeOptionsLike {
  oncomplete: (data: DaumPostcodeDataLike) => void;
  onclose?: () => void;
  width: string;
  height: string;
  maxSuggestItems?: number;
}

interface DaumPostcodeInstance {
  embed: (container: HTMLElement) => void;
  open: () => void;
}

interface DaumPostcodeConstructorLike {
  new (options: DaumPostcodeOptionsLike): DaumPostcodeInstance;
}

interface DaumNamespaceLike {
  Postcode: DaumPostcodeConstructorLike;
}

interface Swing2AppPluginLike {
  app: {
    login: {
      doAppLogin: (userId: string, userName: string) => void;
      doAppLogout: () => void;
    };
  };
}

declare global {
  interface Window {
    daum?: DaumNamespaceLike;
    swingWebViewPlugin?: Swing2AppPluginLike;
  }
}
