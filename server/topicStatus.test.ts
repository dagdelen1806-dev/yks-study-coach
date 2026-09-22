import { describe, expect, it } from "vitest";
import { deriveTopicStatus, MIN_RELIABLE_QUESTION_COUNT } from "../shared/topicStatus";

describe("konu durumu hesaplama (deriveTopicStatus)", () => {
  it("%55 altını Zayıf olarak sınıflandırır", () => {
    expect(deriveTopicStatus(30, 20).status).toBe("Zayıf");
    expect(deriveTopicStatus(54, 20).status).toBe("Zayıf");
  });

  it("%55-84 aralığını Orta olarak sınıflandırır", () => {
    expect(deriveTopicStatus(55, 20).status).toBe("Orta");
    expect(deriveTopicStatus(84, 20).status).toBe("Orta");
  });

  it("%85 ve üzerini İyi olarak sınıflandırır", () => {
    expect(deriveTopicStatus(85, 20).status).toBe("İyi");
    expect(deriveTopicStatus(100, 20).status).toBe("İyi");
  });

  it("soru hacmi düşükken veri yetersiz bayrağını işaretler ama yine de bir durum döner", () => {
    const result = deriveTopicStatus(90, MIN_RELIABLE_QUESTION_COUNT - 1);
    expect(result.insufficientData).toBe(true);
    expect(result.status).toBe("İyi");
  });

  it("soru hacmi yeterliyse veri yetersiz bayrağı false olur", () => {
    expect(deriveTopicStatus(90, MIN_RELIABLE_QUESTION_COUNT).insufficientData).toBe(false);
  });
});
