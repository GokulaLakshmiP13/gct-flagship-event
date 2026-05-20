import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import QRCode from "react-qr-code";
import { z } from "zod";
import {
  ArrowRight,
  CalendarDays,
  Search,
  CheckCircle2,
  Cpu,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  LogOut,
  Menu,
  ShieldCheck,
  Check,
  CheckSquare,
  Square,
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

const Events = () => {
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
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEventsForBulk, setSelectedEventsForBulk] = useState<string[]>([]);

  const userName = profile?.display_name || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Dashboard";
  const navItems = user
    ? ["Events", userName]
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
        const { data } = await supabase.from("event_registrations").select("*").order("created_at", { ascending: false });
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
                const isRegisterOrUser = item === "Register" || item === userName;
                if (isRegisterOrUser) {
                  return (
                    <Link
                      key={item}
                      to="/dashboard"
                      className="text-sm font-semibold text-muted-foreground transition-colors duration-300 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {item}
                    </Link>
                  );
                }
                const isEvents = item === "Events";
                const href = isEvents ? "#events" : `/#${item.toLowerCase()}`;
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
                  const isRegisterOrUser = item === "Register" || item === userName;
                  if (isRegisterOrUser) {
                    return (
                      <Link
                        key={item}
                        to="/dashboard"
                        onClick={closeMenu}
                        className="rounded-md px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {item}
                      </Link>
                    );
                  }
                  const isEvents = item === "Events";
                  const href = isEvents ? "#events" : `/#${item.toLowerCase()}`;
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

        <div className="h-20" />

        <section id="events" className="section-pad geometric-field bg-background">
          <div className="section-shell">
            <div className="reveal max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">Events at பொறிக்களம்</p>
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
                  {!isAdmin && (
                    <Button variant="eventOutline" className="mt-8" onClick={() => chooseEvent(`core-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`)}>
                      Register
                    </Button>
                  )}
                </article>
              ))}
            </div>

            <div className="mt-16 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-accent/15 pb-4">
              <div className="flex items-center gap-3">
                <Cpu className="h-5 w-5 text-accent" />
                <h3 className="font-display text-2xl font-bold text-cream">Explore Events</h3>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/50 border-accent/20"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[140px] bg-background/50 border-accent/20">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    <SelectItem value="CSE">CSE</SelectItem>
                    <SelectItem value="ECE">ECE</SelectItem>
                    <SelectItem value="EEE">EEE</SelectItem>
                    <SelectItem value="MECH">MECH</SelectItem>
                    <SelectItem value="OPEN">OPEN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedEventsForBulk.length > 0 && !isAdmin && (
              <div className="sticky top-24 z-40 mt-6 flex items-center justify-between bg-card-gradient border border-accent/30 p-4 rounded-lg shadow-gold-lg backdrop-blur-xl">
                <div>
                  <p className="text-cream font-bold">{selectedEventsForBulk.length} event{selectedEventsForBulk.length > 1 ? 's' : ''} selected</p>
                  <p className="text-xs text-muted-foreground">Register for multiple events at once.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={() => setSelectedEventsForBulk([])} className="text-muted-foreground">Clear</Button>
                  <Button variant="event" onClick={() => chooseEvent(selectedEventsForBulk.join(','))}>
                    Register Collectively
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {domainEvents
                .flatMap((group) => group.events.map(([title, description]) => ({ category: group.category, title, description })))
                .filter(event => selectedCategory === "All" || event.category === selectedCategory)
                .filter(event => event.title.toLowerCase().includes(searchQuery.toLowerCase()) || event.description.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((event) => {
                  const option = eventOptions.find((e) => e.title === event.title && e.category === event.category);
                  if (!option) return null;
                  const isSelected = selectedEventsForBulk.includes(option.key);

                  return (
                    <article
                      key={option.key}
                      onClick={() => {
                        if (isAdmin) return;
                        setSelectedEventsForBulk(prev =>
                          prev.includes(option.key) ? prev.filter(k => k !== option.key) : [...prev, option.key]
                        );
                      }}
                      className={`group relative rounded-lg border p-6 shadow-soft transition-all duration-300 cursor-pointer hover:-translate-y-1 ${isSelected ? 'border-accent bg-accent/10 shadow-gold' : 'border-accent/15 bg-card-gradient hover:border-accent/50 hover:shadow-gold'
                        }`}
                    >
                      {!isAdmin && (
                        <div className="absolute right-4 top-4">
                          {isSelected ? <CheckSquare className="text-accent w-5 h-5" /> : <Square className="text-muted-foreground w-5 h-5 opacity-40 group-hover:opacity-100" />}
                        </div>
                      )}
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-soft-gold">{event.category}</p>
                      <h4 className="mt-4 font-display text-2xl font-bold text-cream pr-6">{event.title}</h4>
                      <p className="mt-3 leading-7 text-muted-foreground">{event.description}</p>
                      {!isAdmin && (
                        <div className="mt-6 flex justify-between items-center">
                          <Button
                            variant={isSelected ? "default" : "eventOutline"}
                            size="sm"
                            className={isSelected ? "bg-accent text-black font-bold" : ""}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (selectedEventsForBulk.length > 0 && !isSelected) {
                                setSelectedEventsForBulk(prev => [...prev, option.key]);
                              } else {
                                chooseEvent(option.key);
                              }
                            }}
                          >
                            {isSelected ? "Selected" : "Register"}
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })}
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



export default Events;
