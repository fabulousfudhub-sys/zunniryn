import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, BookOpen, Award, Users, ShieldCheck, ScrollText, MapPin, Phone, Mail, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import hero from "@/assets/hero.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zinnuryn Academy Bauchi — Excellence in Learning" },
      { name: "description", content: "Zinnuryn Academy Bauchi: Nursery, Primary, and Secondary education built on discipline, character, and academic excellence." },
      { property: "og:title", content: "Zinnuryn Academy Bauchi" },
      { property: "og:description", content: "Nursery, Primary, and Secondary education in Bauchi." },
    ],
  }),
  component: Landing,
});

function LogoBadge({ size = 48 }: { size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-md ring-1 ring-black/5"
      style={{ width: size, height: size }}
    >
      <img src={logo} alt="Zinnuryn Academy crest" className="h-full w-full object-contain" />
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="absolute top-0 left-0 right-0 z-20">
        <div className="container mx-auto flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <LogoBadge size={52} />
            <div className="text-primary-foreground drop-shadow-md">
              <div className="font-display text-lg font-bold leading-tight">Zinnuryn Academy</div>
              <div className="text-xs uppercase tracking-[0.2em] text-gold">Bauchi · Est. Pen Mightier Than Sword</div>
            </div>
          </div>
          <nav className="hidden items-center gap-2 md:flex">
            <a href="#sections" className="px-3 text-sm text-primary-foreground/85 hover:text-primary-foreground">Academics</a>
            <a href="#why" className="px-3 text-sm text-primary-foreground/85 hover:text-primary-foreground">Why us</a>
            <a href="#contact" className="px-3 text-sm text-primary-foreground/85 hover:text-primary-foreground">Contact</a>
            <Link to="/results-portal"><Button variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">Check Results</Button></Link>
            <Link to="/auth"><Button className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold">Portal</Button></Link>
          </nav>
          <Link to="/auth" className="md:hidden">
            <Button size="sm" className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold">Portal</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-[92vh] min-h-[640px] w-full overflow-hidden">
        <img src={hero} alt="Zinnuryn Academy campus at golden hour" className="absolute inset-0 h-full w-full object-cover" width={1920} height={1080} />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/90 via-primary/70 to-primary/95" />
        <div className="relative z-10 container mx-auto flex h-full flex-col items-start justify-center px-6">
          <span className="rounded-full border border-gold/40 bg-gold/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.25em] text-gold backdrop-blur">
            Nursery · Primary · Secondary
          </span>
          <h1 className="mt-6 max-w-4xl font-display text-5xl font-bold leading-[1.05] text-primary-foreground md:text-7xl">
            Where discipline meets <span className="text-gold">academic distinction.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-primary-foreground/85">
            A complete academic home built on character, faith, and rigorous learning — from Nursery 1 to Senior Secondary 3.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold h-12 px-7 text-base">
                Access School Portal <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/results-portal">
              <Button size="lg" variant="outline" className="h-12 px-7 text-base border-primary-foreground/30 bg-white/5 text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
                Check Student Results
              </Button>
            </Link>
          </div>

          {/* stats strip */}
          <div className="mt-14 grid w-full max-w-3xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 backdrop-blur">
            {[
              { v: "3", l: "Sections" },
              { v: "12+", l: "Class Levels" },
              { v: "100%", l: "WAEC-Aligned" },
            ].map((s) => (
              <div key={s.l} className="bg-primary/70 px-6 py-5 text-primary-foreground">
                <div className="font-display text-3xl font-bold text-gold">{s.v}</div>
                <div className="text-xs uppercase tracking-wider text-primary-foreground/70">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sections */}
      <section id="sections" className="container mx-auto px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold">Academic structure</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-primary md:text-5xl">Three sections, one standard.</h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            { title: "Nursery", classes: "Nursery 1 – 3", note: "Foundational learning through play, phonics, and character." },
            { title: "Primary", classes: "Primary 1 – 6", note: "Core literacy, numeracy, and discovery across all disciplines." },
            { title: "Secondary", classes: "JSS 1 – SSS 3", note: "Rigorous WAEC-aligned preparation for university and life." },
          ].map((s) => (
            <article key={s.title} className="group relative overflow-hidden rounded-2xl border bg-card p-8 shadow-elegant transition hover:-translate-y-1">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-gold" />
              <h3 className="font-display text-2xl font-bold text-primary">{s.title}</h3>
              <p className="mt-1 text-sm uppercase tracking-wider text-gold">{s.classes}</p>
              <p className="mt-4 text-muted-foreground">{s.note}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Why */}
      <section id="why" className="bg-primary text-primary-foreground">
        <div className="container mx-auto grid gap-12 px-6 py-24 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold">The Portal</p>
            <h2 className="mt-3 font-display text-4xl font-bold md:text-5xl">A complete digital home for the school.</h2>
            <p className="mt-5 text-primary-foreground/80">
              Built for administrators, teachers, parents, and students — every academic action lives in one secure place.
            </p>
            <Link to="/auth" className="mt-8 inline-block">
              <Button size="lg" className="bg-gradient-gold text-gold-foreground hover:opacity-90 shadow-gold">Open the portal</Button>
            </Link>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Users, label: "Admissions & student records" },
              { icon: BookOpen, label: "Classes, arms & subjects" },
              { icon: ScrollText, label: "Continuous assessment & exams" },
              { icon: Award, label: "Auto-graded results & ranking" },
              { icon: ShieldCheck, label: "Scratch-card parent access" },
              { icon: GraduationCap, label: "Report cards & transcripts" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-4">
                <Icon className="mt-0.5 h-5 w-5 text-gold" />
                <span className="text-sm font-medium">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="container mx-auto px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-gold">Visit us</p>
          <h2 className="mt-3 font-display text-4xl font-bold text-primary">Come see the campus.</h2>
          <p className="mt-3 text-muted-foreground">Reach out for admissions, tours, or any general enquiry.</p>
        </div>
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-3">
          {[
            { icon: MapPin, label: "Fadaman Mada, Bauchi" },
            { icon: Phone, label: "+234 — Contact admin" },
            { icon: Mail, label: "info@zinnuryn.example" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border bg-card p-5 shadow-sm">
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-6 py-8 md:flex-row">
          <div className="flex items-center gap-3">
            <LogoBadge size={40} />
            <span className="font-display font-semibold text-primary">Zinnuryn Academy, Bauchi</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Zinnuryn Academy. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
