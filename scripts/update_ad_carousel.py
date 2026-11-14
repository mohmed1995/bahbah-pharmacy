# -*- coding: utf-8 -*-
"""Replace AdCarousel in home.tsx with Ads v2:
noon-style split layout (main banner + 2 side tiles), story-style progress
segments, ken-burns zoom, staggered copy entrance, live countdown,
promo-code copy chip, touch swipe."""
import io

P = "src/components/bahbah/home.tsx"
s = io.open(P, encoding="utf-8").read()

# locate the old AdCarousel section (comment block through end of function)
start_anchor = "/* Ad banner carousel"
START = s.rindex("/* ------", 0, s.index(start_anchor))
end_anchor = s.index("/* Hero ", START)
END = s.rindex("/* ------", 0, end_anchor)

NEW = '''/* ------------------------------------------------------------------ */
/* Ads v2 — noon-style split: main banner + side tiles, story bars,    */
/* ken-burns zoom, live countdown, promo-code chip, touch swipe        */
/* ------------------------------------------------------------------ */

const SLIDE_MS = 6500;

function CountdownChip() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const ms = Math.max(0, end.getTime() - now);
  const pad = (x: number) => String(x).padStart(2, "0");
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return (
    <span
      dir="ltr"
      className="bb-count inline-flex items-center gap-1.5 rounded-full bg-[#DC4B4B] px-2.5 py-1 font-heading text-[11px] font-black tabular-nums text-white shadow-md md:text-xs"
    >
      {pad(h)}:{pad(m)}:{pad(sec)}
    </span>
  );
}

function CodeChip({ code }: { code: string }) {
  const t = useT();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (navigator.clipboard) navigator.clipboard.writeText(code).catch(() => {});
        toast.success(t("ads.copied"));
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-white/60 bg-white/15 px-3 py-2 text-[11px] font-black text-white backdrop-blur transition hover:bg-white/30 md:text-xs"
    >
      <Copy className="size-3.5" />
      <span className="opacity-80">{t("ads.code")}:</span>
      <span dir="ltr" className="font-heading tracking-wide">{code}</span>
    </button>
  );
}

function AdSideTile({
  img,
  title,
  sub,
  cta,
  tint,
  onClick,
}: {
  img: string;
  title: string;
  sub: string;
  cta: string;
  tint: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative h-36 overflow-hidden rounded-2xl shadow-md ring-1 ring-black/5 transition hover:shadow-xl sm:h-44 lg:h-auto lg:rounded-3xl"
    >
      <Image
        src={img}
        alt={title}
        fill
        sizes="(max-width:1024px) 50vw, 380px"
        className="object-cover transition duration-700 group-hover:scale-110"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
      <span className={`absolute inset-0 bg-gradient-to-tr ${tint} to-transparent opacity-40 mix-blend-multiply`} />
      <span className="absolute inset-x-0 bottom-0 flex flex-col items-start p-3.5 text-start text-white md:p-4">
        <span className="font-heading text-sm font-black drop-shadow md:text-lg">{title}</span>
        <span className="mt-0.5 hidden text-[11px] font-semibold text-white/85 sm:block md:text-xs">{sub}</span>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-3.5 py-1.5 text-[10px] font-black text-[#112D51] shadow-md transition group-hover:gap-2 md:text-[11px]">
          {cta}
          <IconChevronR className="size-3 rtl:rotate-180" />
        </span>
      </span>
    </button>
  );
}

function AdCarousel() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const slides = useAdSlides();
  const { go, openCatalog } = useBahbah();
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchX = useRef<number | null>(null);

  const n = slides.length;

  const next = useCallback(() => setIdx((i) => (i + 1) % Math.max(n, 1)), [n]);
  const prev = useCallback(
    () => setIdx((i) => (i - 1 + Math.max(n, 1)) % Math.max(n, 1)),
    [n]
  );

  useEffect(() => {
    if (paused || n <= 1) return;
    timer.current = setInterval(next, SLIDE_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused, n, next]);

  /* reset index if admin hides slides — render-phase adjustment */
  if (idx >= n && idx !== 0) {
    setIdx(0);
  }

  if (n === 0) return null;

  const slide = slides[idx];
  const offset = lang === "ar" ? idx * 100 : -idx * 100;

  const act = () => {
    switch (slide.action) {
      case "offers":
        go("offers");
        break;
      case "care":
        go("care");
        break;
      case "category":
        openCatalog(slide.category ?? null);
        break;
      default:
        openCatalog(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-3 pt-3 md:px-6 md:pt-5" aria-label={t("ads.title")}>
      <div className="grid gap-3 lg:grid-cols-3 lg:gap-4">
        {/* main banner */}
        <div
          className="group relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5 lg:col-span-2 lg:rounded-3xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => {
            touchX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchX.current === null) return;
            const d = e.changedTouches[0].clientX - touchX.current;
            if (Math.abs(d) > 42) {
              if (lang === "ar") {
                if (d > 0) prev();
                else next();
              } else if (d < 0) next();
              else prev();
            }
            touchX.current = null;
          }}
        >
          <div className="relative h-52 sm:h-64 md:h-80 lg:h-[400px]">
            {/* track */}
            <div
              className="flex h-full transition-transform duration-700 ease-out"
              style={{ transform: `translateX(${offset}%)` }}
            >
              {slides.map((s) => (
                <div
                  key={s.id}
                  className="relative h-full w-full shrink-0"
                  aria-hidden={s.id !== slide.id}
                  inert={s.id !== slide.id || undefined}
                >
                  <Image
                    key={`${s.id}-${s.id === slide.id}`}
                    src={s.img}
                    alt={lang === "ar" ? s.titleKeyAr : s.titleKeyEn}
                    fill
                    sizes="(max-width:1024px) 100vw, 800px"
                    className={`object-cover ${s.id === slide.id ? "bb-kenburns" : ""}`}
                    priority={s.id === "ad-offers"}
                  />
                  {/* readability layers */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className={`absolute inset-0 ${toneTint[s.tone]} mix-blend-multiply`} />

                  {/* copy — staggered entrance */}
                  <div className="absolute inset-x-0 bottom-0 p-4 pb-8 text-white md:p-9 md:pb-12">
                    <div
                      key={`copy-${s.id === slide.id ? "on" : "off"}`}
                      className={`max-w-xl ${s.id === slide.id ? "bb-ad-in" : ""}`}
                    >
                      <Badge className="mb-2 rounded-full bg-[#F09428] px-3 py-1 text-[11px] font-black text-white shadow-md hover:bg-[#F09428] md:mb-3 md:text-xs">
                        {lang === "ar" ? s.badgeAr : s.badgeEn}
                      </Badge>
                      <h2 className="font-heading text-xl font-black leading-tight drop-shadow-md md:text-4xl">
                        {lang === "ar" ? s.titleKeyAr : s.titleKeyEn}
                      </h2>
                      <p className="mt-1 hidden max-w-md text-xs font-semibold text-white/85 drop-shadow sm:block md:mt-2 md:text-base">
                        {lang === "ar" ? s.subKeyAr : s.subKeyEn}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 md:mt-5 md:gap-3">
                        <Button
                          className="h-9 rounded-full bg-white px-5 text-xs font-black text-[#112D51] shadow-lg hover:bg-white/90 md:h-12 md:px-7 md:text-sm"
                          onClick={act}
                        >
                          {lang === "ar" ? s.ctaKeyAr : s.ctaKeyEn}
                          <IconChevronR className="size-4 rtl:rotate-180" />
                        </Button>
                        {s.code && <CodeChip code={s.code} />}
                        {s.urgent && (
                          <span className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur">
                            <span className="text-[10px] font-black text-white/90 md:text-xs">
                              {t("ads.urgent")}
                            </span>
                            <CountdownChip />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* arrows (desktop) */}
            {n > 1 && (
              <>
                <button
                  aria-label="next"
                  onClick={next}
                  className="absolute top-1/2 end-3 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white opacity-0 backdrop-blur transition hover:bg-white/40 group-hover:opacity-100 md:end-4 md:size-11"
                >
                  <IconChevronR className="size-5 rtl:rotate-180" />
                </button>
                <button
                  aria-label="prev"
                  onClick={prev}
                  className="absolute top-1/2 start-3 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/25 text-white opacity-0 backdrop-blur transition hover:bg-white/40 group-hover:opacity-100 md:start-4 md:size-11"
                >
                  <IconChevronR className="size-5 ltr:rotate-180" />
                </button>
              </>
            )}

            {/* story-style progress segments */}
            <div className="absolute inset-x-0 bottom-0 z-10 flex gap-1.5 px-3 pb-2 md:px-5 md:pb-2.5">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  aria-label={`slide-${i + 1}`}
                  onClick={() => setIdx(i)}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/30 transition hover:bg-white/50"
                >
                  {i < idx && <span className="block h-full w-full rounded-full bg-[#F09428]" />}
                  {i === idx && (
                    <span
                      key={`seg-${idx}-${paused}`}
                      style={{ "--seg-dur": `${SLIDE_MS}ms` } as React.CSSProperties}
                      className={`bb-seg-fill block h-full w-0 rounded-full bg-[#F09428] ${
                        paused ? "bb-seg-paused" : ""
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* side tiles — رعاية بحبح + ركن الجيم */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-2 lg:gap-4">
          <AdSideTile
            img="/images/ads/ad-monthly.png"
            title={t("ads.sideCareT")}
            sub={t("ads.sideCareD")}
            cta={t("ads.sideCta")}
            tint="from-[#F09428]/90"
            onClick={() => go("care")}
          />
          <AdSideTile
            img="/images/ads/ad-gym.png"
            title={t("ads.sideGymT")}
            sub={t("ads.sideGymD")}
            cta={t("ads.sideCta")}
            tint="from-[#1E4E8F]/90"
            onClick={() => openCatalog("fitness")}
          />
        </div>
      </div>
    </section>
  );
}

'''

s = s[:START] + NEW + s[END:]

# add Copy icon to the lucide-react import
s = s.replace('import { Dumbbell } from "lucide-react";',
              'import { Copy, Dumbbell } from "lucide-react";', 1)

io.open(P, "w", encoding="utf-8").write(s)
print("AdCarousel v2 installed OK")
