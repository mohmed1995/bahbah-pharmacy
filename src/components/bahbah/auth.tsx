"use client";

import { useMemo, useState } from "react";
import {
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  LogOut,
  Package,
  Heart,
  UserCircle,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  ShoppingBag,
  MapPin,
  Award,
  Gift,
  Sparkles,
  Bike,
  Pill,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBahbah, useT, useCarePlans, matchStaff, roleHome, type AccountTab } from "@/lib/bahbah/store";
import { getProduct, STAFF_ACCOUNTS, DEFAULT_STAFF_PASSWORD, PHARMACY, ROLE_META, type Role } from "@/lib/bahbah/data";
import { fmtPrice, ProductCard } from "./product-card";
import CareMembershipCard, { DayPicker } from "./care-card";
import { IconRefill } from "./icons";
import { toast } from "sonner";

/* ------------------------------------------------------------------ */
/* Login / Signup — role-aware (patient / courier / pharmacist / admin) */
/* ------------------------------------------------------------------ */
const ROLE_CHIPS: { role: Role; labelKey: "role.patient" | "role.courier" | "role.pharmacist" | "role.admin"; quickKey: "auth.quickPatient" | "auth.quickCourier" | "auth.quickPharmacist" | "auth.quickAdmin"; email: string; color: string; icon: React.ReactNode }[] = [
  { role: "patient", labelKey: "role.patient", quickKey: "auth.quickPatient", email: "", color: "#1E4E8F", icon: <UserCircle className="size-4" /> },
  { role: "courier", labelKey: "role.courier", quickKey: "auth.quickCourier", email: "courier@bahbah.eg", color: "#F09428", icon: <Bike className="size-4" /> },
  { role: "pharmacist", labelKey: "role.pharmacist", quickKey: "auth.quickPharmacist", email: "hashem@bahbah.eg", color: "#2E9E6B", icon: <Pill className="size-4" /> },
  { role: "admin", labelKey: "role.admin", quickKey: "auth.quickAdmin", email: "admin@bahbah.eg", color: "#112D51", icon: <ShieldCheck className="size-4" /> },
];

export function LoginView() {
  const t = useT();
  const { login, go } = useBahbah();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [role, setRole] = useState<Role>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const valid = email.includes("@") && password.length >= 6 && (mode === "login" || name.trim().length >= 2);

  const finish = (user: { name: string; email: string; phone?: string; role: Role; driverId?: string }, displayName: string) => {
    login(user);
    toast.success(`${t("auth.hello")} ${displayName}`);
    go(roleHome(user.role));
  };

  const submit = () => {
    if (!valid) {
      toast.error(t("auth.invalid"));
      return;
    }
    /* staff roles must match fixed credentials; patients sign in freely */
    if (role !== "patient") {
      const staff = matchStaff(email, password);
      if (!staff || staff.role !== role) {
        toast.error(t("auth.staffErr"));
        return;
      }
      finish({ ...staff, phone: phone.trim() || undefined }, staff.name.split(" — ")[0]);
      return;
    }
    finish(
      { name: name.trim() || email.split("@")[0], email: email.trim(), phone: phone.trim() || undefined, role: "patient" },
      name.trim() || email.split("@")[0]
    );
  };

  const quickLogin = (r: Role) => {
    if (r === "patient") {
      finish({ name: "أحمد محمد", email: "demo@bahbah.pharmacy", phone: "0100 123 4567", role: "patient" }, "أحمد");
      return;
    }
    const acc = STAFF_ACCOUNTS.find((a) => a.role === r)!;
    finish({ name: acc.nameAr, email: acc.email, role: acc.role, driverId: acc.driverId }, acc.nameAr.split(" — ")[0]);
  };

  const activeChip = ROLE_CHIPS.find((c) => c.role === role)!;

  return (
    <main className="flex items-center justify-center px-4 py-12 md:py-16">
      <div className="w-full max-w-md">
        <div className="hero-pattern rounded-3xl px-6 py-8 text-center text-white">
          <h1 className="font-heading text-2xl font-black">{t("auth.welcome")}</h1>
          <p className="mt-1 text-sm text-white/70">{t("brand.tagline")}</p>
        </div>

        <div className="-mt-4 rounded-3xl border border-border/70 bg-card p-6 shadow-lg">
          {/* role picker */}
          <p className="text-[11px] font-black text-muted-foreground">{t("auth.rolePick")}</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {ROLE_CHIPS.map((c) => (
              <button
                key={c.role}
                onClick={() => {
                  setRole(c.role);
                  if (c.role !== "patient" && mode === "login") setEmail(c.email);
                }}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 text-[11px] font-black transition ${
                  role === c.role
                    ? "border-transparent text-white shadow-md"
                    : "border-border/70 bg-muted/40 text-muted-foreground hover:border-[#1E4E8F]/30"
                }`}
                style={role === c.role ? { backgroundColor: c.color } : undefined}
              >
                {c.icon}
                {t(c.labelKey)}
              </button>
            ))}
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")} className="mt-4">
            <TabsList className="grid h-12 w-full grid-cols-2 rounded-full">
              <TabsTrigger value="login" className="rounded-full font-bold">
                {t("auth.login")}
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full font-bold">
                {t("auth.signup")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={mode} className="mt-4 space-y-3.5">
              {mode === "signup" && (
                <>
                  <IconInput icon={<UserIcon className="size-4" />} placeholder={t("auth.name")} value={name} onChange={setName} />
                  <IconInput icon={<Phone className="size-4" />} placeholder={t("auth.phone")} value={phone} onChange={setPhone} dir="ltr" />
                </>
              )}
              <IconInput icon={<Mail className="size-4" />} placeholder={t("auth.email")} value={email} onChange={setEmail} dir="ltr" />
              <IconInput icon={<Lock className="size-4" />} placeholder={t("auth.password")} value={password} onChange={setPassword} type="password" dir="ltr" />

              {role !== "patient" && mode === "login" && (
                <p className="rounded-xl bg-[#EAF1F9]/70 px-3.5 py-2.5 text-[11px] font-bold leading-relaxed text-[#1E4E8F]" dir="ltr">
                  حساب معتمد للطاقم: {activeChip.email}
                </p>
              )}

              {/* زر الدخول / إنشاء الحساب الحقيقي */}
              <Button size="lg" className="h-12 w-full rounded-full text-base font-bold bg-[#1E4E8F] text-white hover:bg-[#163b6d]" onClick={submit}>
                {mode === "login" ? t("auth.loginBtn") : t("auth.signupBtn")}
              </Button>

              <button
                className="w-full text-center text-sm font-bold text-[#1E4E8F] hover:underline"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
              >
                {mode === "login" ? t("auth.toSignup") : t("auth.toLogin")}
              </button>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}

function IconInput({
  icon,
  placeholder,
  value,
  onChange,
  type = "text",
  dir,
}: {
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dir?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute top-1/2 start-3.5 -translate-y-1/2 text-muted-foreground">{icon}</span>
      <Input
        type={type}
        value={value}
        dir={dir}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-xl ps-10"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loyalty program — points computed from real persisted order history */
/* ------------------------------------------------------------------ */
const TIERS = [
  { key: "loyalty.tier1", min: 0, max: 500, icon: Award },
  { key: "loyalty.tier2", min: 500, max: 1500, icon: Bike },
  { key: "loyalty.tier3", min: 1500, max: Infinity, icon: Gift },
] as const;

function LoyaltyCard() {
  const t = useT();
  const myOrders = useBahbah((s) => s.myOrders);

  const points = useMemo(
    () =>
      Math.round(
        myOrders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.total, 0) / 10
      ) + 120 /* welcome bonus */,
    [myOrders]
  );

  const tierIdx = points >= 1500 ? 2 : points >= 500 ? 1 : 0;
  const tier = TIERS[tierIdx];
  const next = TIERS[Math.min(tierIdx + 1, 2)];
  const pct =
    tier.max === Infinity
      ? 100
      : Math.min(100, Math.round(((points - tier.min) / (next.min - tier.min)) * 100));

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1E4E8F] via-[#16407a] to-[#112D51] p-5 text-white shadow-lg md:p-6">
      <div className="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-[#F09428]/25 blur-2xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-2xl bg-white/10 shadow-inner">
            <tier.icon className="size-7 text-[#F09428]" />
          </span>
          <div>
            <p className="text-xs font-bold text-white/60">{t("loyalty.title")}</p>
            <p className="font-heading text-2xl font-black md:text-3xl">
              {points.toLocaleString("en-US")}{" "}
              <span className="text-sm font-bold text-white/60">{t("loyalty.points")}</span>
            </p>
            <Badge className="mt-1 rounded-full bg-[#F09428] px-3 py-0.5 text-[11px] font-black text-white hover:bg-[#F09428]">
              {t(tier.key)}
            </Badge>
          </div>
        </div>
        <Badge className="gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-bold text-white/80 hover:bg-white/10">
          <Sparkles className="size-3.5 text-[#F09428]" />
          {t("loyalty.earnRule")}
        </Badge>
      </div>

      {/* progress to next tier */}
      <div className="relative mt-5">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#F09428] to-[#f7b25e] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-bold text-white/70">
          {tier.max === Infinity
            ? t("loyalty.max")
            : t("loyalty.toNext")
                .replace("{p}", Math.max(0, next.min - points).toLocaleString("en-US"))
                .replace("{tier}", t(next.key))}
        </p>
      </div>

      {/* benefits */}
      <div className="relative mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs text-white/75 md:grid-cols-3">
        {(["loyalty.b1", "loyalty.b2", "loyalty.b3"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 shrink-0 text-[#F09428]" />
            {t(k)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Account (profile / orders / favorites)                              */
/* ------------------------------------------------------------------ */
export function AccountView() {
  const t = useT();
  const lang = useBahbah((s) => s.lang);
  const user = useBahbah((s) => s.user);
  const myOrders = useBahbah((s) => s.myOrders);
  const favorites = useBahbah((s) => s.favorites);
  const accountTab = useBahbah((s) => s.accountTab);
  const careSub = useBahbah((s) => s.careSub);
  const livePlans = useCarePlans();
  const { logout, reorder, go, openAccount, openTrack, pauseCare, resumeCare, cancelCare, changeCareDay, openCareWizard } = useBahbah();

  if (!user) {
    return (
      <main className="flex flex-col items-center gap-4 py-24 text-center">
        <div className="grid size-20 place-items-center rounded-full bg-muted">
          <UserCircle className="size-10 text-muted-foreground" />
        </div>
        <p className="font-heading text-lg font-bold">{t("account.loginFirst")}</p>
        <Button size="lg" className="mt-2 rounded-full px-10 font-bold" onClick={() => go("login")}>
          {t("auth.login")}
        </Button>
      </main>
    );
  }

  const favProducts = favorites.map((id) => getProduct(id)!).filter(Boolean);
  const role = (user.role ?? "patient") as Role;
  const isStaff = role !== "patient";
  const portalMeta: Record<string, { view: "courier" | "pharmacist" | "admin"; key: "port.courier" | "port.pharmacist" | "port.admin"; icon: React.ReactNode; cls: string }> = {
    courier: { view: "courier", key: "port.courier", icon: <Bike className="size-4" />, cls: "bg-[#FFF4E5] text-[#B45E0A]" },
    pharmacist: { view: "pharmacist", key: "port.pharmacist", icon: <Pill className="size-4" />, cls: "bg-[#EAF6F1] text-[#2E9E6B]" },
    admin: { view: "admin", key: "port.admin", icon: <ShieldCheck className="size-4" />, cls: "bg-[#EAF1F9] text-[#1E4E8F]" },
  };
  const statusMeta: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: { label: t("status.pending"), cls: "bg-[#FFF4E5] text-[#B45E0A]", icon: <Clock className="size-3" /> },
    shipping: { label: t("status.shipping"), cls: "bg-[#EAF1F9] text-[#1E4E8F]", icon: <Truck className="size-3" /> },
    delivered: { label: t("status.delivered"), cls: "bg-[#EAF6F1] text-[#2E9E6B]", icon: <CheckCircle2 className="size-3" /> },
    cancelled: { label: t("status.cancelled"), cls: "bg-[#DC4B4B]/10 text-[#DC4B4B]", icon: <XCircle className="size-3" /> },
  };

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-6 md:px-6 md:pb-16 md:pt-8">
      {/* profile card */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/70 bg-card p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-4">
          <span className="grid size-14 place-items-center rounded-full bg-[#1E4E8F] font-heading text-xl font-black text-white">
            {user.name.charAt(0)}
          </span>
          <div>
            <h1 className="flex flex-wrap items-center gap-2 font-heading text-xl font-black">
              {t("auth.hello")}، {user.name.split(" — ")[0]}
              <Badge className={`rounded-full border-0 px-2.5 py-0.5 text-[10px] font-black ${
                role === "admin"
                  ? "bg-[#EAF1F9] text-[#1E4E8F]"
                  : role === "pharmacist"
                    ? "bg-[#EAF6F1] text-[#2E9E6B]"
                    : role === "courier"
                      ? "bg-[#FFF4E5] text-[#B45E0A]"
                      : "bg-muted text-muted-foreground"
              }`}>
                {lang === "ar" ? ROLE_META[role].ar : ROLE_META[role].en}
              </Badge>
            </h1>
            <p dir="ltr" className="text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="rounded-full border-[#DC4B4B]/30 px-5 font-bold text-[#DC4B4B] hover:bg-[#DC4B4B]/10 hover:text-[#DC4B4B]"
          onClick={() => {
            logout();
            toast.success(t("account.logout"));
          }}
        >
          <LogOut className="size-4" />
          {t("account.logout")}
        </Button>
      </div>

      {/* staff portal shortcut */}
      {isStaff && portalMeta[role] && (
        <button
          onClick={() => go(portalMeta[role].view)}
          className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 text-start shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className="flex items-center gap-3">
            <span className={`grid size-10 place-items-center rounded-xl ${portalMeta[role].cls}`}>
              {portalMeta[role].icon}
            </span>
            <span>
              <span className="block font-heading text-sm font-black">{t(portalMeta[role].key)}</span>
              <span className="block text-[11px] font-bold text-muted-foreground">{t("port.open")}</span>
            </span>
          </span>
          <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
        </button>
      )}

      {/* loyalty program */}
      <div className="mt-5">
        <LoyaltyCard />
      </div>

      <Tabs
        value={accountTab}
        onValueChange={(v) => openAccount(v as AccountTab)}
        className="mt-6"
      >
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-full md:grid-cols-4">
          <TabsTrigger value="orders" className="gap-1.5 rounded-full font-bold">
            <Package className="size-4" />
            {t("account.orders")}
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5 rounded-full font-bold">
            <Heart className="size-4" />
            {t("account.favorites")}
          </TabsTrigger>
          <TabsTrigger value="care" className="gap-1.5 rounded-full font-bold">
            <IconRefill className="size-4" />
            {t("acc.care")}
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-1.5 rounded-full font-bold">
            <UserCircle className="size-4" />
            {t("account.profile")}
          </TabsTrigger>
        </TabsList>

        {/* orders */}
        <TabsContent value="orders" className="mt-5 space-y-3">
          {myOrders.length === 0 ? (
            <EmptyBlock title={t("account.noOrders")} />
          ) : (
            myOrders.map((o) => {
              const meta = statusMeta[o.status];
              return (
                <div key={o.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm md:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-heading font-black text-[#1E4E8F]">{o.id}</span>
                      <Badge className={`gap-1 rounded-full border-0 ${meta.cls} hover:${meta.cls}`}>
                        {meta.icon}
                        {meta.label}
                      </Badge>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground" dir="ltr">
                      {o.date}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
                    {o.items.map((it) => (
                      <div key={it.productId} className="flex items-center justify-between gap-2 text-sm">
                        <span className="truncate">
                          {lang === "ar" ? it.nameAr : it.nameEn}
                          <span className="text-muted-foreground"> × {it.qty}</span>
                        </span>
                        <span className="shrink-0 font-bold">{fmtPrice(it.price * it.qty, t)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <span className="font-heading text-base font-black">
                      {t("account.total")}: <span className="text-[#1E4E8F]">{fmtPrice(o.total, t)}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4 font-bold text-[#1E4E8F]"
                        onClick={() => openTrack(o.id)}
                      >
                        <MapPin className="size-3.5" />
                        {t("track.trackBtn")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full px-4 font-bold"
                        onClick={() => {
                          reorder(o.id);
                          toast.success(t("product.added"));
                        }}
                      >
                        <ShoppingBag className="size-3.5" />
                        {t("account.reorder")}
                        <ChevronRight className="size-3.5 rtl:rotate-180" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* favorites */}
        <TabsContent value="favorites" className="mt-5">
          {favProducts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="grid size-16 place-items-center rounded-full bg-muted">
                <Heart className="size-7 text-muted-foreground" />
              </div>
              <p className="font-heading font-bold">{t("account.noFavs")}</p>
              <p className="text-sm text-muted-foreground">{t("account.favD")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {favProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* رعايتي الشهرية — premium membership management */}
        <TabsContent value="care" className="mt-5">
          {careSub ? (
            <div className="mx-auto max-w-xl">
              <CareMembershipCard
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    {careSub.status === "paused" ? (
                      <Button
                        size="sm"
                        className="h-9 rounded-full bg-[#2E9E6B] px-5 font-black text-white hover:bg-[#268a5d]"
                        onClick={() => {
                          resumeCare();
                          toast.success(t("care.resume"));
                        }}
                      >
                        <IconRefill className="size-4" />
                        {t("care.resume")}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 rounded-full border-white/30 bg-white/10 px-5 font-black text-white hover:bg-white/20 hover:text-white"
                        onClick={() => {
                          pauseCare();
                          toast.success(t("care.pause"));
                        }}
                      >
                        {t("care.pause")}
                      </Button>
                    )}
                    <DayPicker
                      value={careSub.dayPref}
                      onChange={(d) => {
                        changeCareDay(d);
                        toast.success(t("care.changeDay"));
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full border-[#FF9C9C]/40 bg-transparent px-5 font-black text-[#FFB4B4] hover:bg-[#DC4B4B]/25 hover:text-white"
                      onClick={() => {
                        cancelCare();
                        toast.success(t("care.cancel"));
                      }}
                    >
                      {t("care.cancel")}
                    </Button>
                  </div>
                }
              />
              <button
                onClick={() => go("care")}
                className="mt-3 flex w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-start shadow-sm transition hover:shadow-md"
              >
                <span className="text-xs font-bold text-muted-foreground">
                  {t("care.builder.title")} — {t("care.builder.sub")}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-[#1E4E8F]/30 bg-[#EAF1F9]/50 p-6 text-center">
                <IconRefill className="size-8 text-[#1E4E8F]" />
                <p className="font-heading font-bold">{t("care.none")}</p>
                <Button
                  size="sm"
                  className="mt-1 rounded-full bg-[#2E9E6B] px-6 font-black text-white hover:bg-[#268a5d]"
                  onClick={() => go("care")}
                >
                  <IconRefill className="size-4" />
                  {t("care.viewAll")}
                </Button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {livePlans.map((plan) => {
                  const PlanIcon = plan.icon;
                  return (
                    <div key={plan.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="grid size-10 place-items-center rounded-xl text-white"
                          style={{ backgroundColor: plan.color }}
                        >
                          <PlanIcon className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {lang === "ar" ? plan.nameAr : plan.nameEn}
                          </p>
                          <p className="text-xs font-bold text-muted-foreground">
                            {plan.price} {t("misc.currency")} {t("care.perMonth")}
                          </p>
                        </div>
                      </div>
                      <Button
                        className="mt-3 h-9 w-full rounded-full text-xs font-bold text-white"
                        style={{ backgroundColor: plan.color }}
                        onClick={() => {
                          openCareWizard(plan.id);
                          go("care");
                        }}
                      >
                        {t("care.subscribe")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* profile */}
        <TabsContent value="profile" className="mt-5">
          <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <ProfileRow label={t("auth.name")} value={user.name} />
            <ProfileRow label={t("auth.email")} value={user.email} ltr />
            {user.phone && <ProfileRow label={t("auth.phone")} value={user.phone} ltr />}
            <ProfileRow label={t("account.address")} value={PHARMACY.addressAr} />
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function ProfileRow({ label, value, ltr }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0">
      <span className="text-sm font-bold text-muted-foreground">{label}</span>
      <span className="text-sm font-bold" dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}

function EmptyBlock({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-muted">
        <Package className="size-7 text-muted-foreground" />
      </div>
      <p className="text-sm font-bold text-muted-foreground">{title}</p>
    </div>
  );
}
