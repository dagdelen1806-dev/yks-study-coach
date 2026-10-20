import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { tierHighlights } from "@/components/subscription/PlanComparison";
import { PAID_TIERS, TIER_LABELS, type PlanTier } from "@shared/entitlements";
import { appData, footerDisclaimer } from "@shared/yksData";
import { SAMPLE_TESTIMONIALS } from "@shared/testimonials";
import { BarChart3, Building2, CalendarClock, Check, ChevronDown, Map, NotebookPen, PlayCircle, Sparkles, Star, Target, Timer, Users } from "lucide-react";

const formatPrice = (minorUnits: number) => `${(minorUnits / 100).toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;

const FEATURES = [
  { icon: Map, title: "Konu Haritası", text: "ÖSYM kapsamındaki tüm TYT ve AYT konularını gerçek soru verine göre izle: hangisi tamam, hangisi tekrar istiyor, hangisinde henüz veri yok." },
  { icon: BarChart3, title: "Deneme analizi", text: "Netlerini elle gir ya da sonuç belgesinin fotoğrafını yükle; ders ve konu bazında trendini, zayıf konularını tek bakışta gör." },
  { icon: Sparkles, title: "Yapay zekâ ile haftalık plan", text: "Zayıf konuların, deneme trendin ve okul saatlerine göre sana özel, gerçekçi bir haftalık çalışma planı." },
  { icon: Timer, title: "Takvim ve odak modu", text: "Günlük oturumlarını takvimden başlat; zamanlayıcı, beyaz/pembe/kahverengi gürültü ve oturum hatırlatma bildirimleriyle odaklan." },
  { icon: NotebookPen, title: "Soru defteri ve notlar", text: "Çözemediğin soruların fotoğrafını ekle, sesli ya da yazılı not al, formül ve çizimlerini konularına bağla." },
  { icon: Target, title: "Kaynak önerileri", text: "Elindeki kitaplarla ilerlemeni izle; seviyene ve zayıf konularına göre yayıncı bağımsız kaynak önerileri al." },
];

const STEPS = [
  { title: "Hesabını aç", text: "Sınıfını, hedef sınav yılını ve hedef bölümünü birkaç dakikalık kısa bir ankette paylaş." },
  { title: "Denemeni ekle", text: "Son deneme sonucunu gir; Pusula zayıf konularını çıkarıp koç önerisini hazırlar." },
  { title: "Planını uygula", text: "Haftalık planındaki oturumları odak modunda tamamla; her oturum konu haritanı günceller." },
];

const FAQ = [
  { q: "Pusula ücretsiz mi?", a: "Hesap açmak ve temel takip (konu haritası, denemeler, takvim, odak zamanlayıcı) ücretsiz. Yapay zekâ araçları ücretsiz pakette de var ama aylık kotası düşük. Gelişmiş deneme analizleri, plan uyumu, kaynak önerileri ve raporlar ücretli paketlerde açılır; her ücretli pakette 10 gün ücretsiz deneme var." },
  { q: "Paketler arasındaki fark ne?", a: "Temel, Premium ve Pro'da tüm özellikler açık; paketler yalnızca yapay zekâ kotalarında ayrılır: haftalık plan, deneme belgesini okuma, kitap ekleme, sesli not ve not asistanı gibi araçları ayda kaç kez kullanabileceğin." },
  { q: "Yıllık plan nasıl işliyor?", a: "Yıllık plan, başlangıç anketinde seçtiğin sınav yılının YKS'si bitene kadar sürer. Fiyatı, sınava kalan ayların aylık toplamından %20 daha azdır; yani ne zaman alırsan al yalnızca kalan dönem için ödersin." },
  { q: "Aboneliğimi iptal edebilir miyim?", a: "Evet, istediğin an Premium sayfasından iptal edebilirsin. Ödediğin dönem bitene kadar paketini kullanmaya devam edersin, sonra ücretsiz pakete geçersin; verilerin silinmez." },
  { q: "Kayıt olunca hesabım hemen açılıyor mu?", a: "E-postayla kayıt olursan önce adresine gelen bağlantıyla e-postanı doğrularsın. Ardından hesabın bir yönetici tarafından onaylanır ve panele erişebilirsin." },
  { q: "Verilerimi kimler görebilir?", a: "Varsayılan olarak yalnızca sen. Dershanen ya da okulun sana davet kodu verir ve sen onay verirsen; deneme sonuçların, konu durumun, takvimdeki planın ve hedef bilgin kurumunla paylaşılır. Notların, soru defterin, fotoğrafların, sesli notların ve iletişim bilgilerin hiçbir zaman paylaşılmaz; kurumdan istediğin an ayrılabilirsin." },
  { q: "Telefonda kullanabilir miyim?", a: "Evet. Pusula tarayıcıda çalışır ve telefonunun ana ekranına uygulama olarak eklenebilir. İstersen yaklaşan çalışma oturumların için hatırlatma bildirimi de alırsın." },
  { q: "Puan ya da sıralama tahmini veriyor mu?", a: "Hayır. Pusula bir çalışma takip ve planlama aracıdır; resmi puan veya sıralama tahmini sunmaz. Konu kapsamı ÖSYM ve MEB programlarına dayanır." },
  { q: "Dershane ya da okul olarak nasıl kullanırız?", a: "Kurum Paneli ile öğretmenleriniz, onay veren öğrencilerin denemelerini, konu durumlarını ve planlarını izler. Personel, platformdan aldığı davet koduyla Kurum Paneli'ne katılır; öğrencilerinizi de kurumunuzun davet kodlarıyla eklersiniz." },
];

const TIER_TAGLINES: Record<PlanTier, string> = {
  free: "Temel takip, konu haritası ve odak zamanlayıcı.",
  basic: "Düzenli takip ve ara sıra yapay zekâ desteği.",
  premium: "Her gün yapay zekâyla çalışanlar için.",
  premium_plus: "Yoğun soru çözümü ve sınırları zorlayanlar için.",
};

/** Giriş yapmamış ziyaretçinin gördüğü tanıtım sayfası (uygulama yalnızca hesapla kullanılır, bkz. App.tsx). */
export default function Landing() {
  const plans = trpc.subscription.getPlans.useQuery(undefined, { retry: 1 }).data ?? [];
  const monthlyPrice = (tier: PlanTier) => plans.find((plan) => plan.tier === tier && plan.billingPeriod === "monthly")?.price;
  // Onaylı gerçek yorum yoksa (ya da yüklenemezse) açıkça "örnek" etiketli yorumlar gösterilir; yüklenirken hiçbiri.
  const published = trpc.testimonials.published.useQuery(undefined, { retry: 1 });
  const showingSamples = !published.isLoading && (published.data?.length ?? 0) === 0;
  const testimonialList = showingSamples ? SAMPLE_TESTIMONIALS : published.data ?? [];
  const register = () => startLogin("register");
  const login = () => startLogin("login");

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-20 border-b border-ink/[0.06] bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <a href="/" className="flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="h-9 w-9" />
            <span className="whitespace-nowrap text-[17px] font-extrabold">{appData.applicationName}</span>
          </a>
          <nav className="flex items-center gap-1 text-[14px] font-semibold sm:gap-2">
            <a href="#ozellikler" className="hidden rounded-lg px-3 py-2 text-ink-3 hover:text-ink md:block">Özellikler</a>
            <a href="#fiyatlar" className="hidden rounded-lg px-3 py-2 text-ink-3 hover:text-ink md:block">Fiyatlar</a>
            <a href="#kurumlar" className="hidden rounded-lg px-3 py-2 text-ink-3 hover:text-ink md:block">Kurumlar</a>
            <a href="#sss" className="hidden rounded-lg px-3 py-2 text-ink-3 hover:text-ink lg:block">SSS</a>
            <button onClick={login} className="whitespace-nowrap rounded-lg border border-ink/10 bg-white px-3 py-2 text-ink-2 hover:bg-paper sm:border-0 sm:bg-transparent">Giriş yap</button>
            <button onClick={register} className="hidden h-9 whitespace-nowrap rounded-[10px] bg-brand px-4 text-white hover:bg-brand-strong sm:block">Hesap oluştur</button>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-20">
          <div>
            <p className="hero-pill w-fit bg-brand/10 text-brand">Kişisel YKS koçun</p>
            <h1 className="mt-4 text-[36px] font-semibold leading-[1.1] font-display sm:text-[48px]">{appData.tagline}</h1>
            <p className="mt-5 max-w-xl text-[16px] leading-7 text-ink-3">Denemelerin, konu haritan, çalışma takvimin ve sana özel haftalık planın tek yerde. Pusula nerede net kaybettiğini gösterir, bugün neye çalışman gerektiğini söyler ve ilerlemeni her oturumda günceller.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={register} className="h-12 rounded-xl bg-brand px-6 text-[15px] font-semibold text-white hover:bg-brand-strong">Ücretsiz hesap oluştur</button>
              <a href="#video" className="flex h-12 items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-6 text-[15px] font-semibold text-ink-2 hover:bg-paper"><PlayCircle size={18} /> Nasıl çalıştığını izle</a>
            </div>
            <p className="mt-4 text-[13px] text-ink-4">Hesap açmak ücretsiz · Ücretli paketlerde 10 gün ücretsiz deneme</p>
          </div>
          <div className="relative mx-auto w-full max-w-[360px] lg:max-w-none">
            <img src="/illustrations/summit.png" alt="Zirvede bayrak tutan bir yürüyüşçü" className="h-[420px] w-full rounded-[28px] object-cover shadow-overlay" />
            <div className="soft-card absolute -bottom-5 left-4 right-4 flex items-center gap-3 p-4 sm:left-8 sm:right-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand"><CalendarClock size={20} /></div>
              <div><p className="text-[13px] font-semibold">Bugünün planı hazır</p><p className="text-[12px] text-ink-3">Zayıf konularından başlayarak, okul saatlerinin dışına yerleşir.</p></div>
            </div>
          </div>
        </section>

        <section id="ozellikler" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-center text-[28px] font-semibold font-display sm:text-[34px]">Hazırlığının her adımı tek uygulamada</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] leading-7 text-ink-3">Tahmin değil veri: her deneme ve her oturum, neye çalışman gerektiğini biraz daha netleştirir.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="soft-card p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand"><Icon size={21} /></div>
                <h3 className="mt-4 text-[17px] font-semibold">{title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-ink-3">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="video" className="mx-auto max-w-4xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-center text-[28px] font-semibold font-display sm:text-[34px]">3 dakikada Pusula</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-[15px] leading-7 text-ink-3">Uygulamayı verimli kullanmanın adımları, altyazılı kısa bir videoda.</p>
          <video src="/videos/pusula-nasil-kullanilir.mp4" poster="/videos/pusula-nasil-kullanilir.jpg" controls preload="metadata" playsInline className="mt-8 aspect-video w-full rounded-2xl bg-ink shadow-overlay" />
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-[28px] font-semibold font-display sm:text-[34px]">Üç adımda başla</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="soft-card p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-[15px] font-bold text-white">{index + 1}</span>
                <h3 className="mt-4 text-[17px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-ink-3">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {testimonialList.length > 0 && (
          <section id="yorumlar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
            <h2 className="text-center text-[28px] font-semibold font-display sm:text-[34px]">Öğrenciler ne diyor?</h2>
            {showingSamples && <p className="mx-auto mt-3 max-w-2xl text-center text-[13px] text-ink-4">Bunlar örnek yorumlardır. Öğrencilerimizin gerçek yorumları onaylandıkça burada yer alacak.</p>}
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {testimonialList.map((item) => (
                <figure key={item.id} className="soft-card flex flex-col p-6">
                  <div className="flex gap-0.5" aria-label={`${item.rating} / 5`}>{[1, 2, 3, 4, 5].map((value) => <Star key={value} size={16} className={value <= item.rating ? "fill-[var(--pencil)] text-[var(--pencil)]" : "text-ink-4"} />)}</div>
                  <blockquote className="mt-4 flex-1 text-[14.5px] leading-7 text-ink-2">“{item.body}”</blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[15px] font-bold text-brand">{item.displayName.charAt(0).toLocaleUpperCase("tr")}</span>
                    <span><span className="block text-[14px] font-semibold">{item.displayName}</span>{item.detail && <span className="block text-[12.5px] text-ink-3">{item.detail}</span>}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section id="fiyatlar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-center text-[28px] font-semibold font-display sm:text-[34px]">Fiyatlar</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[15px] leading-7 text-ink-3">Ücretli paketlerin hepsinde tüm özellikler açık; paketler yalnızca yapay zekâ kotalarında ayrılır. Yıllık plan sınavına kadar sürer ve kalan süreye göre %20 indirimlidir.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(["free", ...PAID_TIERS] as PlanTier[]).map((tier) => {
              const price = tier === "free" ? 0 : monthlyPrice(tier);
              return (
                <div key={tier} className={`soft-card flex flex-col p-6 ${tier === "premium" ? "border-brand/40 ring-1 ring-brand/20" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="hero-pill w-fit bg-brand/10 text-brand">{TIER_LABELS[tier]}</span>
                    {tier === "premium" && <span className="text-[12px] font-semibold text-brand">En çok tercih edilen</span>}
                  </div>
                  <p className="mt-2 min-h-[40px] text-[13px] leading-5 text-ink-3">{TIER_TAGLINES[tier]}</p>
                  <p className="mt-4"><span className="text-[30px] font-semibold font-display">{price === undefined ? "…" : price === 0 ? "0 ₺" : formatPrice(price)}</span>{tier !== "free" && <span className="text-[13px] text-ink-3"> / ay</span>}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {tierHighlights(tier).map((item) => <li key={item} className="flex items-start gap-2 text-[13px] leading-5 text-ink-2"><Check size={14} className="mt-0.5 shrink-0 text-brand" />{item}</li>)}
                  </ul>
                  <button onClick={register} className={`mt-6 h-11 rounded-xl text-[14px] font-semibold ${tier === "premium" ? "bg-brand text-white hover:bg-brand-strong" : "border border-ink/10 text-ink-2 hover:bg-paper"}`}>{tier === "free" ? "Ücretsiz başla" : "10 gün ücretsiz dene"}</button>
                </div>
              );
            })}
          </div>
        </section>

        <section id="kurumlar" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14 sm:px-6">
          <div className="soft-card grid items-center gap-8 p-7 sm:p-10 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <p className="hero-pill w-fit bg-brand/10 text-brand"><Building2 size={13} className="mr-1 inline" /> Dershane ve okullar için</p>
              <h2 className="mt-4 text-[26px] font-semibold font-display sm:text-[30px]">Öğrencilerinizi tek panelden izleyin</h2>
              <p className="mt-3 text-[15px] leading-7 text-ink-3">Kurum Paneli ile öğretmenleriniz ve koordinatörleriniz, onay veren öğrencilerin deneme sonuçlarını, konu durumlarını ve çalışma planlarını görür; sınıf oluşturur, davet kodu dağıtır ve haftalık özet e-postası alır.</p>
              <ul className="mt-5 grid gap-2 text-[14px] text-ink-2 sm:grid-cols-2">
                {["Sınıf ve öğretmen yönetimi", "Öğrenci başına deneme ve konu takibi", "KVKK onaylı veri paylaşımı", "Kurum için yapay zekâ kredi havuzu"].map((item) => <li key={item} className="flex items-start gap-2"><Check size={15} className="mt-0.5 shrink-0 text-brand" />{item}</li>)}
              </ul>
            </div>
            <div className="flex flex-col gap-3 rounded-2xl bg-paper p-6 text-center">
              <Users className="mx-auto text-brand" size={30} />
              <p className="text-[14px] leading-6 text-ink-3">Kurum personeliyseniz davet kodunuzla Kurum Paneli'ne giriş yapın.</p>
              <a href="/kurum" className="flex h-11 items-center justify-center rounded-xl bg-brand text-[14px] font-semibold text-white hover:bg-brand-strong">Kurum girişi</a>
            </div>
          </div>
        </section>

        <section id="sss" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-14 sm:px-6">
          <h2 className="text-center text-[28px] font-semibold font-display sm:text-[34px]">Sık sorulan sorular</h2>
          <div className="mt-8 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="soft-card group p-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown size={18} className="shrink-0 text-ink-4 transition group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-[14px] leading-6 text-ink-3">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 pb-16 pt-6 text-center sm:px-6">
          <h2 className="text-[28px] font-semibold font-display sm:text-[34px]">Hedefine bugün bir adım yaklaş</h2>
          <p className="mt-3 text-[15px] text-ink-3">Hesabını aç, ilk denemeni ekle; planın birkaç dakika içinde hazır.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <button onClick={register} className="h-12 rounded-xl bg-brand px-6 text-[15px] font-semibold text-white hover:bg-brand-strong">Ücretsiz hesap oluştur</button>
            <button onClick={login} className="h-12 rounded-xl border border-ink/10 bg-white px-6 text-[15px] font-semibold text-ink-2 hover:bg-paper">Zaten hesabım var</button>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/[0.06]">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-[12px] text-ink-4 sm:flex-row sm:justify-between sm:px-6">
          <span>{footerDisclaimer}</span>
          <span>Konu kapsamı ÖSYM ve MEB programlarına dayanır.</span>
        </div>
      </footer>
    </div>
  );
}
