import { ENV } from "../../_core/env";
import { AppleAppStoreProvider } from "./appleProvider";
import { GooglePlayProvider } from "./googleProvider";
import { MockPaymentProvider } from "./mockProvider";
import type { PaymentProvider } from "./types";

/**
 * Provider seçimi tamamen `PAYMENT_PROVIDER` env değişkeninden gelir (spec
 * §16/§40) — kod hiçbir yerde tek bir sağlayıcıya kilitlenmez. Gerçek bir
 * web sağlayıcısı (iyzico/Stripe/Paddle) seçildiğinde buraya yeni bir
 * `case` eklenir; mevcut router/service kodu HİÇ değişmez.
 */
export function paymentProviderFactory(providerName: string = ENV.paymentProvider): PaymentProvider {
  switch (providerName) {
    case "apple":
      return new AppleAppStoreProvider();
    case "google":
      return new GooglePlayProvider();
    case "mock":
    case "web":
    default:
      return new MockPaymentProvider();
  }
}
