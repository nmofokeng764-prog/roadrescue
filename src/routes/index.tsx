import { createFileRoute, Link } from "@tanstack/react-router";
import { Battery, Fuel, Truck, Wrench, CircleDot, KeyRound, MapPin, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, useMe, homeFor } from "@/lib/auth";
import hero from "@/assets/hero.jpg";
import mechanic from "@/assets/mechanic.jpg";
import driver from "@/assets/driver.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RoadRescue — Stranded? We're ready." },
      { name: "description", content: "Request roadside help in seconds. See cost in rand and ETA upfront, then track your provider live." },
      { property: "og:title", content: "RoadRescue — Stranded? We're ready." },
      { property: "og:description", content: "Request roadside help in seconds with upfront cost and live tracking." },
    ],
  }),
  component: Index,
});

const services = [
  { icon: Battery, label: "Battery" },
  { icon: CircleDot, label: "Flat tyre" },
  { icon: Fuel, label: "Fuel" },
  { icon: Wrench, label: "Mechanical" },
  { icon: Truck, label: "Towing" },
  { icon: KeyRound, label: "Lockout" },
];

function Index() {
  const { session } = useAuth();
  const { data: me } = useMe();
  const dash = me ? homeFor(me.role) : "/auth";

  return (
    <main>
      <section className="relative overflow-hidden">
        <img src={hero} alt="Tow truck assisting a car on the highway at dusk" width={1600} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 md:py-36">
          <p className="mb-4 inline-block rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">24/7 roadside assistance</p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-ink-foreground md:text-6xl">Stranded? We're ready.</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-foreground/80">Share your location, pick the problem and see the cost and arrival time before a nearby provider is on the way.</p>
          <div className="mt-8">
            <Button variant="hero" size="xl" asChild>
              <Link to={session ? (me?.role === "customer" ? "/request" : dash) : "/auth"}>Request assistance</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Help for every breakdown</h2>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {services.map((s) => (
            <div key={s.label} className="card-surface flex flex-col items-center gap-3 p-5">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent text-accent-foreground"><s.icon className="h-6 w-6" /></span>
              <span className="text-sm font-semibold">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 md:grid-cols-2">
        <img src={driver} alt="Driver waiting safely behind the guardrail" loading="lazy" width={1200} height={912} className="rounded-3xl object-cover shadow-[var(--shadow-card)]" />
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">Know what to expect</h2>
          <ul className="mt-6 space-y-4">
            {[
              { icon: MapPin, t: "Pin your exact spot", d: "We detect your GPS and let you move the pin to a safer meeting point." },
              { icon: Wallet, t: "Upfront cost in rand", d: "See an estimated price before you submit the request." },
              { icon: Clock, t: "Live tracking", d: "Watch your provider head your way with status updates in real time." },
            ].map((x) => (
              <li key={x.t} className="flex gap-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><x.icon className="h-5 w-5" /></span>
                <div><p className="font-bold">{x.t}</p><p className="text-muted-foreground">{x.d}</p></div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm font-medium text-primary"><strong>Stay safe:</strong> on a busy highway, exit the vehicle and wait away from traffic.</p>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <img src={mechanic} alt="Roadside mechanic changing a tyre" loading="lazy" width={1200} height={912} className="absolute inset-0 h-full w-full object-cover" />
        <div className="banner-overlay absolute inset-0" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-ink-foreground">
          <h2 className="text-3xl font-extrabold tracking-tight">Run a roadside business?</h2>
          <p className="mt-2 max-w-lg text-ink-foreground/80">Join RoadRescue as a service provider and receive nearby jobs straight to your dashboard.</p>
          <Button className="mt-6" size="lg" asChild><Link to="/register-provider">Register as a service provider</Link></Button>
        </div>
      </section>

      <footer className="border-t bg-card py-8 text-center text-sm text-muted-foreground">© {new Date().getFullYear()} RoadRescue</footer>
    </main>
  );
}
