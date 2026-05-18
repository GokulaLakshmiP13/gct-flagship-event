import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Menu, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

const navItems = ["Events", "About", "Register"];

const events = [
  {
    title: "Keynote Confluence",
    description: "Flagship talks from founders, researchers, and creative technologists shaping connected futures.",
  },
  {
    title: "Innovation Labs",
    description: "Hands-on product showcases, AI demos, and design systems built for scale and cultural relevance.",
  },
  {
    title: "Evening Exchange",
    description: "Curated networking, live showcases, and premium hospitality for builders and decision-makers.",
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
          <div className="animate-fade-up">
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

          <div className="animate-fade-up md:justify-self-end" style={{ animationDelay: "140ms" }}>
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

      <section id="events" className="section-pad bg-background">
        <div className="section-shell">
          <div className="max-w-3xl animate-fade-up">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">Events</p>
            <h2 className="mt-4 font-display text-4xl font-bold text-cream md:text-5xl">Built for the next generation of builders.</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <article
                key={event.title}
                className="group animate-fade-up rounded-lg border border-accent/20 bg-card-gradient p-7 shadow-soft transition-all duration-300 hover:-translate-y-2 hover:border-accent/55 hover:shadow-gold-lg"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="mb-8 h-1 w-12 rounded-full bg-accent transition-all duration-300 group-hover:w-20" />
                <h3 className="font-display text-2xl font-bold text-cream">{event.title}</h3>
                <p className="mt-4 min-h-24 leading-7 text-muted-foreground">{event.description}</p>
                <Button variant="eventOutline" className="mt-8" asChild>
                  <a href="#register">View details</a>
                </Button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="section-pad bg-section-gradient">
        <div className="section-shell grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:items-start">
          <div className="animate-fade-up">
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-accent">About</p>
            <h2 className="mt-4 font-display text-4xl font-bold text-cream md:text-5xl">A refined platform for meaningful convergence.</h2>
          </div>
          <div className="animate-fade-up space-y-6 text-lg leading-8 text-muted-foreground" style={{ animationDelay: "120ms" }}>
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
          <div className="animate-fade-up rounded-lg border border-accent/25 bg-card-gradient p-8 shadow-soft md:p-12 lg:p-14">
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