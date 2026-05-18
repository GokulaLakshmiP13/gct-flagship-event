import { FormEvent, useEffect, useMemo, useState } from "react";
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

const navItems = ["Events", "About", "Register"];

const coreEvents = [
  {
    pillar: "Build",
    title: "Hackathon",
    description: "Develop real-world solutions in teams within a limited time frame.",
  },
  {
    pillar: "Think",
    title: "Coding & Quiz",
    description: "Test logical thinking, programming skills, and technical knowledge.",
  },
  {
    pillar: "Present",
    title: "Paper & Pitch",
    description: "Showcase ideas, research, and innovations to judges and experts.",
  },
  {
    pillar: "Learn",
    title: "Workshops",
    description: "Gain hands-on experience in emerging technologies and domains.",
  },
];

const domainEvents = [
  {
    category: "CSE",
    events: [
      ["Coding Contest", "Solve algorithmic problems under time constraints."],
      ["Debugging Challenge", "Identify and fix errors in given programs."],
      ["Web Development", "Build a functional website for a given problem."],
    ],
  },
  {
    category: "ECE",
    events: [
      ["Circuit Debugging", "Analyze and correct faulty electronic circuits."],
      ["PCB Design", "Convert circuit diagrams into efficient PCB layouts."],
    ],
  },
  {
    category: "MECH",
    events: [["CAD Design", "Create accurate 2D/3D models using design tools."]],
  },
  {
    category: "EEE",
    events: [
      ["Power Simulation", "Analyze power systems using simulation tools."],
      ["Electrical Circuit Debugging", "Identify and resolve faults in electrical circuits."],
    ],
  },
  {
    category: "OPEN",
    events: [
      ["UI/UX Design", "Design intuitive and user-friendly interfaces."],
      ["Tech Quiz", "Test knowledge across multiple technical domains."],
      ["Project Expo", "Showcase working models and innovative projects."],
    ],
  },
];

const eventOptions = domainEvents.flatMap((group) =>
  group.events.map(([title, description]) => ({
    key: `${group.category.toLowerCase()}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`,
    category: group.category,
    title,
    description,
  })),
);

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

const Index = () => {
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
        const { data } = await supabase.from("event_registrations").select("*").order("created_at", { ascending: false });
        setAdminRegistrations(data ?? []);
      }

      setIsDataLoading(false);
    };

    loadData();
  }, [user]);

  const closeMenu = () => setIsMenuOpen(false);

  const chooseEvent = (eventKey: string) => {
    setRegistrationForm((current) => ({ ...current, event_key: eventKey }));
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
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
    }
    setIsAuthLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setIsAuthLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
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

    setProfile(profilePayload as Profile);
    const { data: refreshed } = await supabase.from("event_registrations").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setRegistrations(refreshed ?? []);
    setSuccessMessage(`Registration submitted for ${eventMeta.title}.`);
    toast({ title: "Registration submitted", description: `${eventMeta.title} has been added to your dashboard.` });
    setRegistrationForm((current) => ({ ...current, event_key: "", team_name: "", teammate_names: "", notes: "" }));
    setIsRegistrationLoading(false);
  };

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          isScrolled ? "border-accent/20 bg-background/92 shadow-soft backdrop-blur-xl" : "border-accent/10 bg-background/20 backdrop-blur-md"
        }`}
      >
        <div className="section-shell flex h-20 items-center justify-between">
          <a href="#hero" className="group text-xl tracking-normal" aria-label="இணைவுFest home">
            <span className="font-display font-extrabold text-cream transition-colors group-hover:text-accent">இணைவு</span>
            <span className="font-sans font-semibold text-accent">Fest</span>
          </a>

          <div className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a
                key={item}
                href={item === "Register" ? "#register" : `#${item.toLowerCase()}`}
                className="text-sm font-semibold text-muted-foreground transition-colors duration-300 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {item}
              </a>
            ))}
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
              {navItems.map((item) => (
                <a
                  key={item}
                  href={item === "Register" ? "#register" : `#${item.toLowerCase()}`}
                  onClick={closeMenu}
                  className="rounded-md px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <section id="hero" className="relative flex min-h-[92vh] items-center bg-hero-gradient pt-24">
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute left-1/2 top-28 h-56 w-56 -translate-x-1/2 rounded-full bg-accent/15 blur-3xl animate-slow-glow" />
        <div className="section-shell relative grid gap-12 py-16 md:grid-cols-[1.12fr_0.88fr] md:items-center lg:py-20">
          <div className="reveal">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-card/35 px-4 py-2 text-sm font-semibold text-soft-gold shadow-soft backdrop-blur-md">
              <Sparkles className="h-4 w-4" />
              Flagship technology and culture summit
            </div>
            <h1 className="max-w-4xl font-display text-5xl font-extrabold leading-[0.96] tracking-normal text-cream sm:text-6xl lg:text-7xl">
              <span>இணைவு</span>
              <span className="font-sans font-extrabold text-accent">Fest</span> 2026
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              A premium gathering where technology, creativity, and community converge through sharp ideas and curated experiences.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Button variant="event" size="lg" asChild>
                <a href="#register">
                  Register now <ArrowRight />
                </a>
              </Button>
              <Button variant="eventOutline" size="lg" asChild>
                <a href="#events">Explore events</a>
              </Button>
            </div>
          </div>

          <div className="reveal md:justify-self-end" style={{ transitionDelay: "140ms" }}>
            <div className="relative rounded-lg border border-accent/25 bg-card-gradient p-6 shadow-soft backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1">
              <div className="mb-10 flex items-center justify-between border-b border-accent/15 pb-5">
                <span className="text-sm font-bold uppercase tracking-[0.28em] text-soft-gold">Chennai</span>
                <CalendarDays className="text-accent" />
              </div>
              <p className="font-display text-4xl font-bold leading-tight text-cream">3 days of insight, showcase, and connection.</p>
              <div className="mt-10 grid grid-cols-3 gap-3 text-center">
                {[
                  ["40+", "Sessions"],
                  ["120", "Speakers"],
                  ["8k", "Guests"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-md border border-accent/15 bg-background/40 p-4">
                    <div className="text-2xl font-extrabold text-accent">{value}</div>
                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="events" className="section-pad geometric-field bg-background">
        <div className="section-shell">
          <div className="reveal max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">Events at இணைவுFest</p>
            <h2 className="mt-4 font-display text-4xl font-bold text-cream md:text-5xl">A multi-domain platform for builders.</h2>
            <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">Structured experiences across building, thinking, presenting, and hands-on learning.</p>
          </div>

          <div className="mt-12 flex items-center gap-3 border-b border-accent/15 pb-4">
            <Lightbulb className="h-5 w-5 text-accent" />
            <h3 className="font-display text-2xl font-bold text-cream">Core Experience</h3>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {coreEvents.map((event, index) => (
              <article
                key={event.title}
                className="reveal group rounded-lg border border-accent/20 bg-card-gradient p-7 shadow-soft transition-all duration-300 hover:-translate-y-2 hover:border-accent/55 hover:shadow-gold-lg"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="mb-7 inline-flex rounded-full border border-accent/25 bg-background/35 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-soft-gold">
                  {event.pillar}
                </div>
                <h3 className="font-display text-2xl font-bold text-cream">{event.title}</h3>
                <p className="mt-4 min-h-20 leading-7 text-muted-foreground">{event.description}</p>
                <Button variant="eventOutline" className="mt-8" asChild>
                  <a href="#register">Register interest</a>
                </Button>
              </article>
            ))}
          </div>

          <div className="mt-16 flex items-center gap-3 border-b border-accent/15 pb-4">
            <Cpu className="h-5 w-5 text-accent" />
            <h3 className="font-display text-2xl font-bold text-cream">Domain-wise Events</h3>
          </div>
          <div className="mt-6 space-y-8">
            {domainEvents.map((group, groupIndex) => (
              <div key={group.category} className="reveal" style={{ transitionDelay: `${groupIndex * 80}ms` }}>
                <div className="mb-4 inline-flex rounded-full border border-accent/25 bg-card/45 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-accent">
                  {group.category}
                </div>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {group.events.map(([title, description]) => {
                    const option = eventOptions.find((event) => event.title === title && event.category === group.category);
                    return (
                      <article
                        key={`${group.category}-${title}`}
                        className="group rounded-lg border border-accent/15 bg-card-gradient p-6 shadow-soft transition-all duration-300 hover:-translate-y-2 hover:border-accent/50 hover:shadow-gold"
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-soft-gold">{group.category}</p>
                        <h4 className="mt-4 font-display text-2xl font-bold text-cream">{title}</h4>
                        <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
                        <Button variant="eventOutline" size="sm" className="mt-6" onClick={() => option && chooseEvent(option.key)}>
                          Register
                        </Button>
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="section-pad geometric-field bg-section-gradient">
        <div className="section-shell grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div className="reveal">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">About</p>
            <h2 className="mt-4 font-display text-4xl font-bold text-cream md:text-5xl">A refined platform for meaningful convergence.</h2>
          </div>
          <div className="reveal space-y-6 text-lg leading-8 text-muted-foreground" style={{ transitionDelay: "120ms" }}>
            <p>இணைவுFest is designed as a high-end meeting ground for ambitious teams, creative leaders, and technology communities.</p>
            <p>Every session, showcase, and exchange is structured for clarity: fewer distractions, stronger conversations, and a premium atmosphere.</p>
          </div>
        </div>
      </section>

      <section id="register" className="section-pad bg-background">
        <div className="section-shell">
          <div className="reveal grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">Registration</p>
              <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold text-cream md:text-5xl">Secure your place at இணைவுFest 2026.</h2>
              <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">
                Create an account, choose your event, and track your submissions from a private participant dashboard.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                {[
                  [ShieldCheck, "Secure storage", "Participant records are protected behind authenticated access."],
                  [CheckCircle2, "Clear validation", "Forms check every required detail before submission."],
                  [LayoutDashboard, "Event tracking", "Admins can review registrations event-wise."],
                ].map(([Icon, title, copy]) => (
                  <div key={title as string} className="rounded-lg border border-accent/15 bg-card-gradient p-5 shadow-soft">
                    <Icon className="h-5 w-5 text-accent" />
                    <h3 className="mt-4 font-display text-xl font-bold text-cream">{title as string}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy as string}</p>
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
                <Tabs defaultValue="register">
                  <div className="mb-6 flex flex-col gap-4 border-b border-accent/15 pb-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="flex items-center gap-2 text-sm font-semibold text-soft-gold">
                        <UserRound className="h-4 w-4" /> {user.email}
                      </p>
                      <h3 className="mt-2 font-display text-2xl font-bold text-cream">Participant workspace</h3>
                    </div>
                    <Button variant="eventOutline" size="sm" onClick={handleSignOut}>
                      <LogOut className="h-4 w-4" /> Sign out
                    </Button>
                  </div>

                  <TabsList className="grid h-auto w-full grid-cols-3 border border-accent/15 bg-background/50 p-1">
                    <TabsTrigger value="register" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                      Register
                    </TabsTrigger>
                    <TabsTrigger value="mine" className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                      My events
                    </TabsTrigger>
                    <TabsTrigger value="admin" disabled={!isAdmin} className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
                      Admin
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="register" className="mt-6">
                    <form onSubmit={handleRegistration} className="space-y-5">
                      <div className="space-y-2">
                        <Label>Event</Label>
                        <Select value={registrationForm.event_key} onValueChange={(value) => setRegistrationForm({ ...registrationForm, event_key: value })}>
                          <SelectTrigger className="bg-background/70">
                            <SelectValue placeholder="Choose an event" />
                          </SelectTrigger>
                          <SelectContent>
                            {eventOptions.map((event) => (
                              <SelectItem key={event.key} value={event.key}>
                                {event.category} · {event.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.event_key && <p className="text-sm text-destructive-foreground">{errors.event_key}</p>}
                        {registrationForm.event_key && <p className="text-sm leading-6 text-muted-foreground">{selectedEvent.description}</p>}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        {[
                          ["display_name", "Participant name"],
                          ["phone", "Phone"],
                          ["college", "College"],
                          ["department", "Department"],
                          ["year_of_study", "Year / Level"],
                          ["team_name", "Team name"],
                        ].map(([key, label]) => (
                          <div key={key} className="space-y-2">
                            <Label htmlFor={key}>{label}</Label>
                            <Input
                              id={key}
                              value={registrationForm[key as keyof RegistrationForm] ?? ""}
                              onChange={(event) => setRegistrationForm({ ...registrationForm, [key]: event.target.value })}
                              className="bg-background/70"
                            />
                            {errors[key] && <p className="text-sm text-destructive-foreground">{errors[key]}</p>}
                          </div>
                        ))}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="teammate_names">Teammates</Label>
                          <Textarea
                            id="teammate_names"
                            value={registrationForm.teammate_names ?? ""}
                            onChange={(event) => setRegistrationForm({ ...registrationForm, teammate_names: event.target.value })}
                            className="bg-background/70"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={registrationForm.notes ?? ""}
                            onChange={(event) => setRegistrationForm({ ...registrationForm, notes: event.target.value })}
                            className="bg-background/70"
                          />
                        </div>
                      </div>

                      {errors.form && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">{errors.form}</p>}
                      {successMessage && <p className="rounded-md border border-accent/30 bg-accent/10 p-3 text-sm font-semibold text-cream">{successMessage}</p>}
                      <Button type="submit" variant="event" className="w-full" disabled={isRegistrationLoading}>
                        {isRegistrationLoading && <Loader2 className="animate-spin" />}
                        Submit event registration
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="mine" className="mt-6">
                    <RegistrationList registrations={registrations} emptyText={isDataLoading ? "Loading registrations..." : "No event registrations yet."} />
                  </TabsContent>

                  <TabsContent value="admin" className="mt-6">
                    {isAdmin ? (
                      <AdminPanel registrations={adminRegistrations} />
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
          <a href="#hero" className="text-lg tracking-normal">
            <span className="font-display font-extrabold text-cream">இணைவு</span>
            <span className="font-sans font-semibold text-accent">Fest</span>
          </a>
          <p>© 2026 இணைவுFest. Crafted for connection.</p>
        </div>
      </footer>
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

const AdminPanel = ({ registrations }: { registrations: Registration[] }) => {
  const eventCounts = registrations.reduce<Record<string, number>>((acc, item) => {
    acc[item.event_name] = (acc[item.event_name] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
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

export default Index;
