/** PortOne (IamPort) V1 SDK type declarations */

interface PortOnePaymentRequest {
  pg: string;
  pay_method: string;
  merchant_uid: string;
  name: string;
  amount: number;
  buyer_email?: string;
  buyer_name?: string;
  buyer_tel?: string;
}

interface PortOnePaymentResponse {
  success: boolean;
  imp_uid: string;
  merchant_uid: string;
  error_msg?: string;
  error_code?: string;
  paid_amount?: number;
  status?: string;
}

interface PortOneIMP {
  init(impCode: string): void;
  request_pay(
    params: PortOnePaymentRequest,
    callback: (response: PortOnePaymentResponse) => void,
  ): void;
}

// Augment globalThis so `globalThis.IMP` is recognized
// eslint-disable-next-line no-var
declare var IMP: PortOneIMP | undefined;
