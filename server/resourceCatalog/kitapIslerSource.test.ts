import { describe, expect, it } from "vitest";
import { HeuristicHtmlExtractor } from "./sources/kitapIslerSource";

// This fixture is a trimmed, verbatim excerpt of the REAL server-rendered
// response for https://www.kitapisler.com/YKS-Yuksekogretim-Kurum-Sinavi-1196
// (captured 2026-09-19 via a plain, unauthenticated `fetch()` — no
// JavaScript execution involved; the product grid and full category tree
// are both present in the plain HTML). Kept as a fixture per spec §49/§50 —
// tests never touch the live site.
const SAMPLE_HTML = `
<li class="top_cat1197"><a href="https://www.kitapisler.com/TYT-Temel-Yeterlilik-Testi-1197" title="TYT (Temel Yeterlilik Testi)" >TYT (Temel Yeterlilik Testi)</a><ul class="submenu">
<li class="top_cat1368"><a href="https://www.kitapisler.com/TYT-1-Oturum-Konu-1368" title="TYT Konu Anlatımlı" >TYT Konu Anlatımlı</a></li>
</ul></li>
<li class="top_cat543"><a href="https://www.kitapisler.com/KPSS-543" title="KPSS" >KPSS</a></li>

<div class="categoryWrap">
<div class="listingProductListing listingProductListingFull">
<div class="listingProductListingInner">
<div class="listingProduct">
<a onclick="" href="yaricap-yayinlari-2028-algoritma-ve-bilisim-maarif-fasikulu-1-asama_109611.html" title="YarıÇap Yayınları 2028 Algoritma ve Bilişim Maarif Fasikülü 1. Aşama"><img src="images_buyuk/f11/yaricap-2028_1.jpg" alt="..."/></a>
</div>
<div class="dmarka"><a href="Yari-Cap-Yayinlari_br_829" title="YarıÇap Yayınları"><span><img src="https://www.kitapisler.com/custom/marka_images/t1.jpg" /></span></a></div>
<div class="listingProductName list_title_type1_text"><a onclick="" href="yaricap-yayinlari-2028-algoritma-ve-bilisim-maarif-fasikulu-1-asama_109611.html" title="YarıÇap Yayınları 2028 Algoritma ve Bilişim Maarif Fasikülü 1. Aşama"><span>YarıÇap Yayınları 2028 Algoritma ve Bilişim Maarif Fasikülü 1. Aşama</span></a></div>
<div class="listingPriceWrap">
<div class="listfiyat">
<div class="listingProductDiscount"><span> <span id="divdiscountpercentage109611">% 15</span></span></div>
<div class="listingPriceMarket as" style=""><span id="divprice109611"><span id="pric">145,00</span> ₺</span><script>var originalprice109611=145;</script></div>
<div class="listingPriceNormal as"><span id="divdiscountprice109611" class="divdiscountprice"><span id="pric">123,25</span> ₺</span></div>
</div>
</div>
</div>

<div class="listingProduct">
<a onclick="" href="retro-yayincilik-tyt-turkce-ultimate-soru-bankasi_109583.html" title="Retro Yayıncılık TYT Türkçe Ultimate Soru Bankası"><img src="images_buyuk/f11/retro-turkce_1.jpg" alt="..."/></a>
</div>
<div class="dmarka"><a href="retro-yayinlari_br_1545" title="Retro Yayınları"><span><img src="https://www.kitapisler.com/custom/marka_images/t2.jpg" /></span></a></div>
<div class="listingProductName list_title_type1_text"><a onclick="" href="retro-yayincilik-tyt-turkce-ultimate-soru-bankasi_109583.html" title="Retro Yayıncılık TYT Türkçe Ultimate Soru Bankası"><span>Retro Yayıncılık TYT Türkçe Ultimate Soru Bankası</span></a></div>
<div class="listingPriceWrap">
<div class="listfiyat">
<div class="listingProductDiscount"><span> <span id="divdiscountpercentage109583">% 40</span></span></div>
<div class="listingPriceMarket as" style=""><span id="divprice109583"><span id="pric">450,00</span> ₺</span></div>
<div class="listingPriceNormal as"><span id="divdiscountprice109583" class="divdiscountprice"><span id="pric">270,00</span> ₺</span></div>
</div>
</div>
</div>

<div class="listingProduct">
<a onclick="" href="yaricap-yayinlari-2028-algoritma-ve-bilisim-maarif-fasikulu-1-asama_109611.html" title="YarıÇap Yayınları 2028 Algoritma ve Bilişim Maarif Fasikülü 1. Aşama"><img src="images_buyuk/f11/dup.jpg" alt="..."/></a>
</div>
<div class="listingProductName list_title_type1_text"><a onclick="" href="yaricap-yayinlari-2028-algoritma-ve-bilisim-maarif-fasikulu-1-asama_109611.html" title="YarıÇap Yayınları 2028 Algoritma ve Bilişim Maarif Fasikülü 1. Aşama"><span>duplicate</span></a></div>
</div>
</div>
</div>
`;

describe("HeuristicHtmlExtractor (kitapisler — gerçek, doğrulanmış HTML yapısına göre; spec §49/§50 uyarınca yalnızca fixture ile test edilir)", () => {
  const extractor = new HeuristicHtmlExtractor();

  it("ürünleri `-slug_<id>.html` desenine göre çıkarır ve aynı üründeki tekrar linklerini eler", () => {
    const products = extractor.extractProducts(SAMPLE_HTML, "https://www.kitapisler.com/TYT-1-Oturum-Konu-1368", "TYT Türkçe Soru Bankası");
    const ids = products.map((p) => p.sourceProductId);
    expect(ids).toEqual(["109611", "109583"]);
  });

  it("her ürün için source/sourceUrl/rawName/rawPublisher/rawPrice/rawImageUrl alanlarını doğru doldurur", () => {
    const [first] = extractor.extractProducts(SAMPLE_HTML, "https://www.kitapisler.com/TYT-1-Oturum-Konu-1368", "TYT Türkçe Soru Bankası");
    expect(first.source).toBe("kitapisler");
    expect(first.rawName).toBe("YarıÇap Yayınları 2028 Algoritma ve Bilişim Maarif Fasikülü 1. Aşama");
    expect(first.sourceUrl).toBe("https://www.kitapisler.com/yaricap-yayinlari-2028-algoritma-ve-bilisim-maarif-fasikulu-1-asama_109611.html");
    expect(first.rawPublisher).toBe("YarıÇap Yayınları");
    expect(first.rawImageUrl).toContain("yaricap-2028_1.jpg");
  });

  it("indirimli fiyat varsa indirimli fiyatı, TL biçimini (virgül ondalık, nokta binlik) doğru sayıya çevirerek alır", () => {
    const [first] = extractor.extractProducts(SAMPLE_HTML, "x", "TYT Türkçe Soru Bankası");
    expect(first.rawPrice).toBe(123.25);
  });

  it("kategori başlığından ders bilgisini çıkarır (rawMetadata.subjectLabel)", () => {
    const [first] = extractor.extractProducts(SAMPLE_HTML, "x", "TYT Türkçe Soru Bankası");
    expect(first.rawMetadata?.subjectLabel).toBe("Türkçe");
  });

  it("category tree'den yalnızca TYT/AYT/YKS ile ilgili alt kategorileri çıkarır, ilgisiz kategorileri (KPSS vb.) filtreler", () => {
    const categories = extractor.extractCategoryLinks(SAMPLE_HTML);
    const titles = categories.map((c) => c.title);
    expect(titles).toContain("TYT (Temel Yeterlilik Testi)");
    expect(titles).toContain("TYT Konu Anlatımlı");
    expect(titles).not.toContain("KPSS");
  });

  it("ürün grid'i boşsa (örn. sayfa değiştiyse) hata fırlatmadan boş dizi döner", () => {
    expect(extractor.extractProducts("<html><body>ürün yok</body></html>", "x", "x")).toEqual([]);
  });
});
