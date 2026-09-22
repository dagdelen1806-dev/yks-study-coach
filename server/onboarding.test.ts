import { describe, expect, it } from "vitest";
import { emptyOnboardingDraft, isStepValid, validateOnboardingStep } from "../shared/onboarding";

describe("validateOnboardingStep — adım 0 (kullanıcı tanımlama)", () => {
  it("ad, sınıf düzeyi, sınav yılı ve hedef puan türü zorunludur", () => {
    const errors = validateOnboardingStep(0, emptyOnboardingDraft());
    expect(errors.preferredName).toBeTruthy();
    expect(errors.gradeLevel).toBeTruthy();
    expect(errors.examYear).toBeTruthy();
    expect(errors.targetScoreType).toBeTruthy();
  });

  it("tüm zorunlu alanlar doluysa geçerlidir", () => {
    const draft = { ...emptyOnboardingDraft(), preferredName: "Ece", gradeLevel: "12" as const, examYear: String(new Date().getFullYear() + 1), targetScoreType: "SAY" as const };
    expect(isStepValid(0, draft)).toBe(true);
  });

  it("makul olmayan bir sınav yılını reddeder", () => {
    const draft = { ...emptyOnboardingDraft(), preferredName: "Ece", gradeLevel: "12" as const, examYear: "1999", targetScoreType: "SAY" as const };
    expect(validateOnboardingStep(0, draft).examYear).toBeTruthy();
  });
});

describe("validateOnboardingStep — adım 1 (akademik durum)", () => {
  it("tamamen boş bırakılsa bile geçerlidir ('Bilmiyorum' her zaman geçerli bir yanıt)", () => {
    expect(isStepValid(1, emptyOnboardingDraft())).toBe(true);
  });
});

describe("validateOnboardingStep — adım 2 (hedefler)", () => {
  it("hedef üniversite/bölüm boş bırakılabilir", () => {
    expect(isStepValid(2, emptyOnboardingDraft())).toBe(true);
  });
});

describe("validateOnboardingStep — adım 3 (çalışma düzeni)", () => {
  it("boş bırakılsa geçerlidir (günlük süre isteğe bağlı)", () => {
    expect(isStepValid(3, emptyOnboardingDraft())).toBe(true);
  });

  it("günlük çalışma süresi 0-960 dakika aralığı dışındaysa hata verir", () => {
    const draft = { ...emptyOnboardingDraft(), dailyStudyDuration: "2000" };
    expect(validateOnboardingStep(3, draft).dailyStudyDuration).toBeTruthy();
  });

  it("makul bir süre geçerlidir", () => {
    const draft = { ...emptyOnboardingDraft(), dailyStudyDuration: "180" };
    expect(isStepValid(3, draft)).toBe(true);
  });
});

describe("validateOnboardingStep — adım 4 (koçluk tercihleri)", () => {
  it("boş bırakılsa geçerlidir", () => {
    expect(isStepValid(4, emptyOnboardingDraft())).toBe(true);
  });
});
