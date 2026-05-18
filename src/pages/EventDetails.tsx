import { FormEvent, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  MapPin,
  IndianRupee,
  ShieldCheck
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { eventOptions } from "@/data/events";
import { sendRegistrationToSheet } from "@/integrations/googleSheets";
import type { Session, User } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

// Razorpay type declaration
declare global {
  interface Window {
    Razorpay: any;
  }
}

const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().min(7, "Enter a valid phone number").max(20),
  college: z.string().trim().min(2, "College is required").max(120),
  department: z.string().trim().min(2, "Department is required").max(80),
  year_of_study: z.string().trim().min(1, "Year is required").max(40),
});

const registrationSchema = profileSchema.extend({
  team_name: z.string().trim().max(80).optional(),
  teammate_names: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(600).optional(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;
type Profile = Tables<"profiles">;

const EventDetails = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isRegistrationLoading, setIsRegistrationLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState<"none" | "just_registered" | "already_registered">("none");
  
  const eventMeta = eventOptions.find((e) => e.key === eventId);

  const [registrationForm, setRegistrationForm] = useState<RegistrationForm>({
    display_name: "",
    phone: "",
    college: "",
    department: "",
    year_of_study: "",
    team_name: "",
    teammate_names: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    setIsDataLoading(true);
    setRegistrationStatus("none");

    const checkUser = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      
      if (data.session?.user && eventMeta) {
        // Load profile and check registration
        const [{ data: profileData }, { data: regData }] = await Promise.all([
          supabase.from("profiles").select("*").eq("user_id", data.session.user.id).maybeSingle(),
          supabase.from("event_registrations").select("*").eq("user_id", data.session.user.id).eq("event_key", eventMeta.key).maybeSingle()
        ]);

        if (profileData) {
          setRegistrationForm((current) => ({
            ...current,
            display_name: profileData.display_name || "",
            phone: profileData.phone || "",
            college: profileData.college || "",
            department: profileData.department || "",
            year_of_study: profileData.year_of_study || "",
          }));
        } else {
          // Clear it out for new users so nothing is left over
          setRegistrationForm({
            display_name: "",
            phone: "",
            college: "",
            department: "",
            year_of_study: "",
            team_name: "",
            teammate_names: "",
            notes: "",
          });
        }

        if (regData) {
          setRegistrationStatus("already_registered");
        } else {
          setRegistrationStatus("none");
        }
      }
      setIsDataLoading(false);
    };

    checkUser();
  }, [eventMeta]);

  if (!eventMeta) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="font-display text-4xl font-bold text-cream">Event Not Found</h1>
        <p className="mt-4 text-muted-foreground">The event you are looking for does not exist.</p>
        <Button className="mt-8" onClick={() => navigate("/")}>Return Home</Button>
      </div>
    );
  }

  const handlePaymentAndRegistration = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!user || !session?.user.email) {
      toast({ title: "Authentication required", description: "Please sign in from the home page first.", variant: "destructive" });
      navigate("/#register");
      return;
    }

    setErrors({});
    const parsed = registrationSchema.safeParse(registrationForm);
    if (!parsed.success) {
      setErrors(
        parsed.error.errors.reduce<Record<string, string>>((acc, issue) => {
          const key = issue.path[0]?.toString();
          if (key) acc[key] = issue.message;
          return acc;
        }, {})
      );
      return;
    }

    setIsRegistrationLoading(true);

    // Save profile first
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

    // Initialize Razorpay Payment
    const options = {
      key: "rzp_test_dummy_key", // REPLACE WITH REAL RAZORPAY KEY IN PRODUCTION
      amount: (eventMeta.fee || 150) * 100, // Amount in paise
      currency: "INR",
      name: "பொறிக்களம் 2026",
      description: `Registration for ${eventMeta.title}`,
      handler: async function (response: any) {
        // Payment successful, now save registration
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
          // You might want to add a payment_id column in Supabase
          // payment_id: response.razorpay_payment_id 
        });

        setIsRegistrationLoading(false);

        if (registrationError) {
          toast({ title: "Registration Error", description: registrationError.message, variant: "destructive" });
        } else {
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

          setRegistrationStatus("just_registered");
          toast({ title: "Registration Successful!", description: `You are now registered for ${eventMeta.title}.` });
        }
      },
      prefill: {
        name: parsed.data.display_name,
        email: session.user.email,
        contact: parsed.data.phone
      },
      theme: {
        color: "#D4AF37" // soft-gold
      }
    };

    if (options.key === "rzp_test_dummy_key") {
      // Simulate successful payment for testing purposes since a real key isn't provided
      toast({ title: "Test Mode", description: "Simulating successful payment..." });
      setTimeout(() => {
        options.handler({ razorpay_payment_id: "pay_test_123456" });
      }, 1500);
      return;
    }

    const rzp = new window.Razorpay(options);
    rzp.on("payment.failed", function (response: any) {
      toast({ title: "Payment Failed", description: response.error.description, variant: "destructive" });
      setIsRegistrationLoading(false);
    });
    rzp.open();
  };

  return (
    <main className="min-h-screen bg-background text-foreground pb-20">
      <nav className="border-b border-accent/15 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="section-shell flex h-20 items-center justify-between">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-muted-foreground hover:text-accent transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </button>
          <div className="font-display font-extrabold text-xl tracking-normal">
            <span className="text-cream">பொறிக்களம்</span>
          </div>
        </div>
      </nav>

      <div className="section-shell max-w-4xl pt-12">
        <div className="grid gap-12 md:grid-cols-[1fr_400px]">
          <div>
            <div className="inline-flex rounded-full border border-accent/25 bg-card/45 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-accent mb-6">
              {eventMeta.category}
            </div>
            <h1 className="font-display text-4xl font-bold text-cream mb-4">{eventMeta.title}</h1>
            <p className="text-lg leading-relaxed text-muted-foreground mb-8">
              {eventMeta.description}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-10">
              <div className="flex items-center gap-3 p-4 rounded-lg border border-accent/15 bg-card-gradient">
                <CalendarDays className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Date</p>
                  <p className="font-semibold text-cream">TBA</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-lg border border-accent/15 bg-card-gradient">
                <MapPin className="h-5 w-5 text-accent" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Venue</p>
                  <p className="font-semibold text-cream">Chennai</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-accent/25 bg-card-gradient p-6 shadow-soft h-fit sticky top-28">
            <h3 className="font-display text-2xl font-bold text-cream border-b border-accent/15 pb-4 mb-6">
              Registration
            </h3>

            <div className="flex items-center justify-between mb-8 p-4 rounded-lg bg-background/50 border border-accent/15">
              <span className="font-semibold text-muted-foreground">Registration Fee</span>
              <span className="text-2xl font-bold text-accent flex items-center gap-1">
                <IndianRupee className="h-5 w-5" />
                {eventMeta.fee || 150}
              </span>
            </div>

            {isDataLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="animate-spin text-accent h-8 w-8" /></div>
            ) : !user ? (
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">You must be signed in to register for events.</p>
                <Button className="w-full" variant="event" onClick={() => navigate("/#register")}>Sign in to continue</Button>
              </div>
            ) : registrationStatus !== "none" ? (
              <div className="text-center space-y-4 py-6 bg-accent/5 rounded-lg border border-accent/20">
                <ShieldCheck className="h-12 w-12 text-accent mx-auto" />
                <h4 className="text-xl font-bold text-cream">
                  {registrationStatus === "just_registered" ? "Registered Successfully" : "Already Registered"}
                </h4>
                <p className="text-sm text-muted-foreground px-4">You have successfully registered for this event. Check your dashboard for more details.</p>
                {eventMeta.whatsappLink && (
                  <div className="pt-2">
                    <a 
                      href={eventMeta.whatsappLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex h-10 items-center justify-center rounded-md bg-[#25D366] px-8 text-sm font-medium text-white transition-colors hover:bg-[#128C7E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background"
                    >
                      Join WhatsApp Group
                    </a>
                  </div>
                )}
                <div className="pt-2">
                  <Button variant="eventOutline" onClick={() => navigate("/#register")}>View Dashboard</Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handlePaymentAndRegistration} className="space-y-4" autoComplete="off">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Full Name</Label>
                  <Input id="display_name" value={registrationForm.display_name} onChange={(e) => setRegistrationForm({ ...registrationForm, display_name: e.target.value })} className="bg-background/70" />
                  {errors.display_name && <p className="text-xs text-destructive-foreground">{errors.display_name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={registrationForm.phone} onChange={(e) => setRegistrationForm({ ...registrationForm, phone: e.target.value })} className="bg-background/70" />
                  {errors.phone && <p className="text-xs text-destructive-foreground">{errors.phone}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="college">College</Label>
                    <Input id="college" value={registrationForm.college} onChange={(e) => setRegistrationForm({ ...registrationForm, college: e.target.value })} className="bg-background/70" />
                    {errors.college && <p className="text-xs text-destructive-foreground">{errors.college}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year_of_study">Year/Level</Label>
                    <Input id="year_of_study" value={registrationForm.year_of_study} onChange={(e) => setRegistrationForm({ ...registrationForm, year_of_study: e.target.value })} className="bg-background/70" />
                    {errors.year_of_study && <p className="text-xs text-destructive-foreground">{errors.year_of_study}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input id="department" value={registrationForm.department} onChange={(e) => setRegistrationForm({ ...registrationForm, department: e.target.value })} className="bg-background/70" />
                  {errors.department && <p className="text-xs text-destructive-foreground">{errors.department}</p>}
                </div>

                <div className="space-y-2 pt-2 border-t border-accent/15">
                  <Label htmlFor="team_name">Team Name (Optional)</Label>
                  <Input id="team_name" value={registrationForm.team_name} onChange={(e) => setRegistrationForm({ ...registrationForm, team_name: e.target.value })} className="bg-background/70" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teammate_names">Teammates (Optional)</Label>
                  <Textarea id="teammate_names" value={registrationForm.teammate_names} onChange={(e) => setRegistrationForm({ ...registrationForm, teammate_names: e.target.value })} className="bg-background/70 text-sm" placeholder="Comma separated names" rows={2} />
                </div>

                {errors.form && <p className="text-sm text-destructive-foreground p-2 bg-destructive/10 rounded border border-destructive/20">{errors.form}</p>}
                
                <Button type="submit" variant="event" className="w-full mt-6" disabled={isRegistrationLoading}>
                  {isRegistrationLoading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
                  Pay & Register
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default EventDetails;
