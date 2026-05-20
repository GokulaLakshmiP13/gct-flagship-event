import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { z } from "zod";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Cpu,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  LogOut,
  Menu,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
  QrCode
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";



import { coreEvents, domainEvents, eventOptions } from "@/data/events";
import { sendRegistrationToSheet } from "@/integrations/googleSheets";

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  college: z.string().trim().min(2, "College is required").max(120),
  department: z.string().trim().min(2, "Department is required").max(80),
  year_of_study: z.string().trim().min(1, "Year is required").max(40),
});

const registrationSchema = profileSchema.extend({
  event_key: z.string().min(1, "Choose an event"),
  team_name: z.string().trim().max(80).optional(),
  teammate_names: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(600).optional(),
});

const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().trim().min(2, "Name must be at least 2 characters").optional().or(z.literal("")),
});

type Profile = Tables<"profiles">;
type Registration = Tables<"event_registrations">;
type RegistrationForm = z.infer<typeof registrationSchema>;
type AuthMode = "signin" | "signup";

const emptyRegistrationForm: RegistrationForm = {
  event_key: "",
  display_name: "",
  phone: "",
  college: "",
  department: "",
  year_of_study: "",
  team_name: "",
  teammate_names: "",
  notes: "",
};

// Change this to the email of the person who should be the overall Super Admin.
const SUPER_ADMIN_EMAIL = "gokula.lakshmip.2005@gmail.com";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [adminRegistrations, setAdminRegistrations] = useState<Registration[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authForm, setAuthForm] = useState({ email: "", password: "", displayName: "" });
  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>(emptyRegistrationForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isRegistrationLoading, setIsRegistrationLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const navItems = user
    ? ["Events", (profile?.display_name || user.email?.split('@')[0] || "Dashboard")]
    : ["Events", "About", "Register"];

  const selectedEvent = useMemo(
    () => eventOptions.find((event) => event.key === registrationForm.event_key) ?? eventOptions[0],
    [registrationForm.event_key],
  );

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRegistrations([]);
      setAdminRegistrations([]);
      setIsAdmin(false);
      return;
    }

    const loadData = async () => {
      setIsDataLoading(true);
      const [{ data: profileData }, { data: roleData }, { data: ownRegistrations }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("event_registrations").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      const admin = roleData?.some((item) => item.role === "admin") ?? false;
      setProfile(profileData ?? null);
      setIsAdmin(admin);
      setRegistrations(ownRegistrations ?? []);

      if (profileData) {
        setRegistrationForm((current) => ({
          ...current,
          display_name: current.display_name || profileData.display_name || "",
          phone: current.phone || profileData.phone || "",
          college: current.college || profileData.college || "",
          department: current.department || profileData.department || "",
          year_of_study: current.year_of_study || profileData.year_of_study || "",
        }));
      }

      if (admin) {
        let query = supabase.from("event_registrations").select("*").order("created_at", { ascending: false });
        // If they are an Event Admin, only fetch their specific event
        if (user.email !== SUPER_ADMIN_EMAIL && profileData?.managed_event) {
          query = query.eq("event_name", profileData.managed_event); // or event_key if that is what we store
        }
        const { data } = await query;
        setAdminRegistrations(data ?? []);
      }

      setIsDataLoading(false);
    };

    loadData();
  }, [user]);

  const closeMenu = () => setIsMenuOpen(false);

  const chooseEvent = (eventKey: string) => {
    navigate(`/event/${eventKey}`);
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    const parsed = authSchema.safeParse(authForm);
    if (!parsed.success) {
      setAuthError(parsed.error.errors[0]?.message ?? "Please check your details.");
      return;
    }

    setIsAuthLoading(true);
    const { email, password, displayName } = parsed.data;
    const result =
      authMode === "signup"
        ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { display_name: displayName || email.split("@")[0] } },
        })
        : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setAuthError(result.error.message);
    } else {
      toast({
        title: authMode === "signup" ? "Check your inbox" : "Signed in",
        description: authMode === "signup" ? "Confirm your email to activate your registration account." : "You can now register for events.",
      });
      if (authMode === "signin") {
        navigate("/events");
      }
    }
    setIsAuthLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setIsAuthLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/events" });
    if (result.error) setAuthError(result.error.message);
    setIsAuthLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSuccessMessage("");
    toast({ title: "Signed out", description: "Your session has ended securely." });
  };

  const handleRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !session?.user.email) {
      setAuthError("Sign in before registering for an event.");
      return;
    }

    setErrors({});
    setSuccessMessage("");
    const parsed = registrationSchema.safeParse(registrationForm);
    if (!parsed.success) {
      setErrors(
        parsed.error.errors.reduce<Record<string, string>>((acc, issue) => {
          const key = issue.path[0]?.toString();
          if (key) acc[key] = issue.message;
          return acc;
        }, {}),
      );
      return;
    }

    const eventMeta = eventOptions.find((item) => item.key === parsed.data.event_key);
    if (!eventMeta) {
      setErrors({ event_key: "Choose a valid event" });
      return;
    }

    setIsRegistrationLoading(true);
    const profilePayload = {
      user_id: user.id,
      display_name: parsed.data.display_name,
      phone: parsed.data.phone,
      college: parsed.data.college,
      department: parsed.data.department,
      year_of_study: parsed.data.year_of_study,
    };

    const { error: profileError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "user_id" });
    if (profileError) {
      setErrors({ form: profileError.message });
      setIsRegistrationLoading(false);
      return;
    }

    const { error: registrationError } = await supabase.from("event_registrations").insert({
      user_id: user.id,
      event_key: eventMeta.key,
      event_name: eventMeta.title,
      event_category: eventMeta.category,
      participant_name: parsed.data.display_name,
      contact_email: session.user.email,
      phone: parsed.data.phone,
      college: parsed.data.college,
      department: parsed.data.department,
      year_of_study: parsed.data.year_of_study,
      team_name: parsed.data.team_name || null,
      teammate_names: parsed.data.teammate_names || null,
      notes: parsed.data.notes || null,
    });

    if (registrationError) {
      setErrors({ form: registrationError.code === "23505" ? "You have already registered for this event." : registrationError.message });
      setIsRegistrationLoading(false);
      return;
    }

    // Send copy to Google Sheet
    sendRegistrationToSheet({
      event_category: eventMeta.category,
      event_name: eventMeta.title,
      participant_name: parsed.data.display_name,
      contact_email: session.user.email,
      phone: parsed.data.phone,
      college: parsed.data.college,
      department: parsed.data.department,
      year_of_study: parsed.data.year_of_study,
      team_name: parsed.data.team_name || "",
      teammate_names: parsed.data.teammate_names || ""
    });

    setProfile(profilePayload as Profile);
    const { data: refreshed } = await supabase.from("event_registrations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setRegistrations(refreshed ?? []);
    setSuccessMessage(`Registration submitted for ${eventMeta.title}.`);
    toast({ title: "Registration submitted", description: `${eventMeta.title} has been added to your dashboard.` });
    setRegistrationForm((current) => ({ ...current, event_key: "", team_name: "", teammate_names: "", notes: "" }));
    setIsRegistrationLoading(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground relative">
      {/* Premium Seamless SVG Mandala Pattern */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg stroke='%23d4af37' stroke-width='0.6' fill='none' stroke-opacity='0.08'%3E%3Ccircle cx='80' cy='80' r='60'/%3E%3Ccircle cx='80' cy='20' r='60'/%3E%3Ccircle cx='80' cy='140' r='60'/%3E%3Ccircle cx='28.03' cy='50' r='60'/%3E%3Ccircle cx='131.96' cy='50' r='60'/%3E%3Ccircle cx='28.03' cy='110' r='60'/%3E%3Ccircle cx='131.96' cy='110' r='60'/%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '160px 160px',
        }}
      />
      <div className="relative z-10">
        <nav
          className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${isScrolled ? "border-accent/20 bg-background/92 shadow-soft backdrop-blur-xl" : "border-accent/10 bg-background/20 backdrop-blur-md"
            }`}
        >
          <div className="section-shell flex h-20 items-center justify-between">
            <Link to="/" className="group text-xl tracking-normal" aria-label="பொறிக்களம் home">
              <span className="font-display font-extrabold text-cream transition-colors group-hover:text-accent">பொறிக்களம்</span>
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              {navItems.map((item) => {
                const isRegisterOrUser = item === "Register" || item === (profile?.display_name || user?.email?.split('@')[0] || "Dashboard");
                if (item === "Events") {
                  return (
                    <Link
                      key={item}
                      to="/events"
                      className="text-sm font-semibold text-muted-foreground transition-colors duration-300 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {item}
                    </Link>
                  );
                }
                const href = isRegisterOrUser ? "#register" : `/#${item.toLowerCase()}`;
                return (
                  <a
                    key={item}
                    href={href}
                    className="text-sm font-semibold text-muted-foreground transition-colors duration-300 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {item}
                  </a>
                );
              })}
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-accent/25 bg-card/40 text-accent transition-all duration-300 hover:border-accent hover:shadow-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
              onClick={() => setIsMenuOpen((value) => !value)}
              aria-label="Toggle navigation menu"
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X /> : <Menu />}
            </button>
          </div>

          <div className={`section-shell grid transition-all duration-300 md:hidden ${isMenuOpen ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="flex flex-col gap-2 rounded-md border border-accent/15 bg-card/70 p-3 backdrop-blur-xl">
                {navItems.map((item) => {
                  const isRegisterOrUser = item === "Register" || item === (profile?.display_name || user?.email?.split('@')[0] || "Dashboard");
                  if (item === "Events") {
                    return (
                      <Link
                        key={item}
                        to="/events"
                        onClick={closeMenu}
                        className="rounded-md px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item}
                      </Link>
                    );
                  }
                  const href = isRegisterOrUser ? "#register" : `/#${item.toLowerCase()}`;
                  return (
                    <a
                      key={item}
                      href={href}
                      onClick={closeMenu}
                      className="rounded-md px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>

        <div className="h-20" /> {/* Spacer for navbar */}

        <section id="register" className="section-pad bg-background">
          <div className="section-shell">
            <div className="reveal grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">Registration</p>
                <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold text-cream md:text-5xl">Secure your place at பொறிக்களம் 2026.</h2>
                <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
                  Create an account, choose your event, and track your submissions from a private participant dashboard.
                </p>
                <div className="mt-10 flex flex-col gap-6">
                  {[
                    [ShieldCheck, "Secure storage", "Participant records are protected behind authenticated access."],
                    [CheckCircle2, "Clear validation", "Forms check every required detail before submission."],
                    [LayoutDashboard, "Event tracking", "Admins can review registrations event-wise."],
                  ].map(([Icon, title, copy]) => (
                    <div key={title as string} className="flex items-start gap-4">
                      <div className="mt-1 shrink-0 rounded-full border border-accent/20 bg-accent/10 p-2.5 shadow-soft">
                        <Icon className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-display text-xl font-bold text-cream">{title as string}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{copy as string}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-accent/25 bg-card-gradient p-5 shadow-soft md:p-7">
                {!user ? (
                  <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as AuthMode)}>
                    <TabsList className="grid h-auto w-full grid-cols-2 border border-accent/15 bg-background/50 p-1">
                      <TabsTrigger value="signin" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                        Sign in
                      </TabsTrigger>
                      <TabsTrigger value="signup" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                        Create account
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value={authMode} className="mt-6">
                      <form onSubmit={handleAuth} className="space-y-4">
                        {authMode === "signup" && (
                          <div className="space-y-2">
                            <Label htmlFor="displayName">Full name</Label>
                            <Input id="displayName" value={authForm.displayName} onChange={(event) => setAuthForm({ ...authForm, displayName: event.target.value })} />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Password</Label>
                          <Input id="password" type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
                        </div>
                        {authError && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">{authError}</p>}
                        <Button type="submit" variant="event" className="w-full" disabled={isAuthLoading}>
                          {isAuthLoading && <Loader2 className="animate-spin" />}
                          {authMode === "signup" ? "Create secure account" : "Sign in to register"}
                        </Button>
                        <Button type="button" variant="eventOutline" className="w-full" onClick={handleGoogleSignIn} disabled={isAuthLoading}>
                          Continue with Google
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <Tabs defaultValue={user.email === SUPER_ADMIN_EMAIL ? "admin" : "mine"}>
                    <div className="mb-6 flex flex-col gap-4 border-b border-accent/15 pb-5 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-display text-2xl font-bold text-cream">Participant workspace</h3>
                        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <UserRound className="h-4 w-4 text-soft-gold" /> {user.email}
                        </p>
                      </div>
                      <Button variant="eventOutline" size="sm" onClick={handleSignOut} className="shrink-0">
                        <LogOut className="h-4 w-4" /> Sign out
                      </Button>
                    </div>

                    <TabsList className={`grid h-auto w-full border border-accent/15 bg-background/50 p-1 ${isAdmin && user.email !== SUPER_ADMIN_EMAIL ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {user.email !== SUPER_ADMIN_EMAIL && (
                        <TabsTrigger value="mine" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                          My events
                        </TabsTrigger>
                      )}
                      {isAdmin && (
                        <TabsTrigger value="admin" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                          {user.email === SUPER_ADMIN_EMAIL ? "Super Admin" : "Event Admin"}
                        </TabsTrigger>
                      )}
                    </TabsList>

                    {user.email !== SUPER_ADMIN_EMAIL && (
                      <TabsContent value="mine" className="mt-6">
                        <div className="mb-6 flex flex-col items-center justify-center rounded-lg border border-accent/25 bg-card-gradient p-6 shadow-soft sm:flex-row sm:justify-start sm:gap-8">
                          <div className="rounded-xl bg-white p-4 shadow-gold">
                            <QRCode value={`porikkalam:user:${user.id}`} size={140} />
                          </div>
                          <div className="mt-4 text-center sm:mt-0 sm:text-left">
                            <h4 className="font-display text-2xl font-bold text-cream">Your Digital Pass</h4>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                              Present this single QR code at any event desk. Organizers will scan it to mark your attendance and verify your registered events!
                            </p>
                          </div>
                        </div>
                        <h4 className="mb-4 text-lg font-bold text-cream">Registered Events</h4>
                        <RegistrationList registrations={registrations} emptyText={isDataLoading ? "Loading registrations..." : "No event registrations yet."} />
                      </TabsContent>
                    )}

                    <TabsContent value="admin" className="mt-6">
                      {isAdmin ? (
                        <AdminPanel registrations={adminRegistrations} isSuperAdmin={user.email === SUPER_ADMIN_EMAIL} />
                      ) : (
                        <p className="rounded-md border border-accent/15 bg-background/50 p-4 text-sm text-muted-foreground">Admin access is restricted.</p>
                      )}
                    </TabsContent>
                  </Tabs>
                )}
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-accent/15 bg-background py-10">
          <div className="section-shell flex flex-col gap-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <Link to="/" className="text-lg tracking-normal">
              <span className="font-display font-extrabold text-cream">பொறிக்களம்</span>
            </Link>
            <p>© 2026 பொறிக்களம். Crafted for connection.</p>
          </div>
        </footer>
      </div>
    </main>
  );
};

const RegistrationList = ({ registrations, emptyText }: { registrations: Registration[]; emptyText: string }) => {
  if (!registrations.length) {
    return <p className="rounded-md border border-accent/15 bg-background/50 p-4 text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="space-y-3">
      {registrations.map((registration) => (
        <article key={registration.id} className="rounded-md border border-accent/15 bg-background/45 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-soft-gold">{registration.event_category}</p>
              <h4 className="mt-2 font-display text-xl font-bold text-cream">{registration.event_name}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{registration.team_name || registration.participant_name}</p>
            </div>
            <span className="rounded-full border border-accent/25 px-3 py-1 text-xs font-bold uppercase text-accent">{registration.status}</span>
          </div>
        </article>
      ))}
    </div>
  );
};

const AdminPanel = ({ registrations, isSuperAdmin }: { registrations: Registration[], isSuperAdmin: boolean }) => {
  const { toast } = useToast();
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [selectedAdminEvent, setSelectedAdminEvent] = useState<string>("");
  const [isPromoting, setIsPromoting] = useState(false);

  const handleMakeAdmin = async () => {
    if (!newAdminEmail || !selectedAdminEvent) {
      toast({ title: "Incomplete", description: "Select an event and enter an email first.", variant: "destructive" });
      return;
    }
    setIsPromoting(true);

    // We are calling the new RPC function we wrote in the SQL script
    const { error } = await supabase.rpc('assign_event_admin', { target_email: newAdminEmail, target_event: selectedAdminEvent });

    if (error) {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${newAdminEmail} is now an Event Admin for ${selectedAdminEvent}!` });
      setNewAdminEmail("");
      setSelectedAdminEvent("");
    }
    setIsPromoting(false);
  };

  const eventCounts = registrations.reduce<Record<string, number>>((acc, item) => {
    acc[item.event_name] = (acc[item.event_name] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        {isSuperAdmin && (
          <div className="bg-card-gradient border border-accent/15 p-4 rounded-md w-full md:w-1/2">
            <h4 className="text-sm font-bold text-cream mb-2">Assign Event Admin</h4>
            <div className="flex flex-col gap-3">
              <Select value={selectedAdminEvent} onValueChange={setSelectedAdminEvent}>
                <SelectTrigger className="w-full bg-black/50 border-accent/20">
                  <SelectValue placeholder="Select event to assign" />
                </SelectTrigger>
                <SelectContent>
                  {eventOptions.map((opt) => (
                    <SelectItem key={opt.key} value={opt.title}>{opt.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  placeholder="organizer@college.edu"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="bg-black/50 border-accent/20 text-sm"
                />
                <Button
                  onClick={handleMakeAdmin}
                  disabled={isPromoting || !newAdminEmail || !selectedAdminEvent}
                  className="bg-accent text-black font-bold hover:bg-accent/80"
                >
                  {isPromoting ? "Promoting..." : "Assign"}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">They must have already created an account on the website.</p>
          </div>
        )}

        <div className="flex flex-col gap-3 shrink-0">
          {isSuperAdmin && (
            <Link 
              to="/superadmin/events" 
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-500 transition-colors"
            >
              Manage Events
            </Link>
          )}
          
          <Link 
            to="/admin/scanner" 
            className="flex items-center justify-center gap-2 bg-accent text-black px-6 py-3 rounded-md font-bold hover:bg-accent/90 transition-colors"
          >
            <QrCode className="w-5 h-5" />
            Open QR Scanner
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-accent/15 bg-background/45 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-soft-gold">Total</p>
          <p className="mt-2 text-3xl font-extrabold text-accent">{registrations.length}</p>
        </div>
        <div className="rounded-md border border-accent/15 bg-background/45 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-soft-gold">Events</p>
          <p className="mt-2 text-3xl font-extrabold text-accent">{Object.keys(eventCounts).length}</p>
        </div>
        <div className="rounded-md border border-accent/15 bg-background/45 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-soft-gold">Submitted</p>
          <p className="mt-2 text-3xl font-extrabold text-accent">{registrations.filter((item) => item.status === "submitted").length}</p>
        </div>
      </div>

      <div className="max-h-[420px] overflow-auto rounded-md border border-accent/15">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-background/80 text-xs uppercase tracking-[0.16em] text-soft-gold">
            <tr>
              <th className="p-3">Event</th>
              <th className="p-3">Participant</th>
              <th className="p-3">College</th>
              <th className="p-3">Contact</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {registrations.map((registration) => (
              <tr key={registration.id} className="border-t border-accent/10 text-muted-foreground">
                <td className="p-3 text-cream">{registration.event_name}</td>
                <td className="p-3">{registration.participant_name}</td>
                <td className="p-3">{registration.college}</td>
                <td className="p-3">{registration.contact_email}</td>
                <td className="p-3 capitalize">{registration.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
