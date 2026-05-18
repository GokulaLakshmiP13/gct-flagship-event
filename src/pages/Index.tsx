import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Cpu, Lightbulb, Menu, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

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
      ["Circuit Debugging", "Identify and resolve faults in electrical circuits."],
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

const Index = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <nav
        className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
          isScrolled
            ? "border-accent/20 bg-background/92 shadow-soft backdrop-blur-xl"
            : "border-accent/10 bg-background/20 backdrop-blur-md"
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

        <div
          className={`section-shell grid transition-all duration-300 md:hidden ${
            isMenuOpen ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
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
                  Reserve your place <ArrowRight />
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

      <section id="events" className="section-pad mandala-field bg-background">
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
                  <a href="#register">View details</a>
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
                  {group.events.map(([title, description]) => (
                    <article
                      key={`${group.category}-${title}`}
                      className="group rounded-lg border border-accent/15 bg-card-gradient p-6 shadow-soft transition-all duration-300 hover:-translate-y-2 hover:border-accent/50 hover:shadow-gold"
                    >
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-soft-gold">{group.category}</p>
                      <h4 className="mt-4 font-display text-2xl font-bold text-cream">{title}</h4>
                      <p className="mt-3 leading-7 text-muted-foreground">{description}</p>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="section-pad bg-section-gradient">
        <div className="section-shell grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div className="reveal">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">About</p>
            <h2 className="mt-4 font-display text-4xl font-bold text-cream md:text-5xl">A refined platform for meaningful convergence.</h2>
          </div>
          <div className="reveal space-y-6 text-lg leading-8 text-muted-foreground" style={{ transitionDelay: "120ms" }}>
            <p>
              இணைவுFest is designed as a high-end meeting ground for ambitious teams, creative leaders, and technology communities.
            </p>
            <p>
              Every session, showcase, and exchange is structured for clarity: fewer distractions, stronger conversations, and a premium atmosphere.
            </p>
          </div>
        </div>
      </section>

      <section id="register" className="section-pad bg-background">
        <div className="section-shell">
          <div className="reveal rounded-lg border border-accent/25 bg-card-gradient p-8 shadow-soft md:p-12 lg:p-14">
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">Registration</p>
                <h2 className="mt-4 max-w-3xl font-display text-4xl font-bold text-cream md:text-5xl">Step into இணைவுFest 2026.</h2>
                <p className="mt-5 max-w-2xl leading-7 text-muted-foreground">Secure access to the flagship sessions, curated networking, and premium festival experiences.</p>
              </div>
              <Button variant="event" size="lg" asChild>
                <a href="mailto:hello@inaivufest.com">
                  Register interest <ArrowRight />
                </a>
              </Button>
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

export default Index;