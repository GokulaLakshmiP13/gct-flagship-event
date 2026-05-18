import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ArrowLeft, CheckCircle, ShieldAlert, User, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { updateAttendanceInSheet } from "@/integrations/googleSheets";

export default function AdminScanner() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [participantData, setParticipantData] = useState<any>(null);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      const isUserAdmin = roles?.some(r => r.role === 'admin') || false;
      setIsAdmin(isUserAdmin);
      if (!isUserAdmin) {
        toast({ title: "Access Denied", description: "You do not have admin privileges.", variant: "destructive" });
        navigate("/");
      }
    };
    checkAdmin();
  }, [navigate, toast]);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Initialize Scanner
  useEffect(() => {
    if (isAdmin !== true) return;
    if (scannerRef.current) return; // Prevent double initialization in Strict Mode

    const scanner = new Html5QrcodeScanner("reader", {
      qrbox: { width: 250, height: 250 },
      fps: 5,
    }, false);
    
    scannerRef.current = scanner;

    scanner.render(
      (result) => {
        try {
          if (scannerRef.current) {
            // Only attempt to pause if it's an active video stream, catching errors if it fails (like when uploading an image)
            scannerRef.current.pause(true);
          }
        } catch (e) {
          console.log("Could not pause scanner, likely an image upload.");
        }
        setScanResult(result);
        fetchParticipantData(result);
      },
      (error) => {
        // ignore continuous scanning errors
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isAdmin]);

  const fetchParticipantData = async (qrData: string) => {
    setIsLoading(true);
    try {
      // Expected format: porikkalam:user:<uuid>
      if (!qrData.startsWith("porikkalam:user:")) {
        throw new Error("Invalid QR Code format. This is not a valid பொறிக்களம் pass.");
      }

      const userId = qrData.replace("porikkalam:user:", "");

      // Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError || !profile) {
        throw new Error("Participant profile not found in database.");
      }

      // Fetch Registrations
      const { data: regData, error: regError } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("user_id", userId);

      setParticipantData(profile);
      setRegistrations(regData || []);
      toast({ title: "Pass Verified", description: "Participant data loaded successfully." });

    } catch (err: any) {
      toast({ title: "Scan Error", description: err.message, variant: "destructive" });
      setScanResult(null); // Reset to scan again
    } finally {
      setIsLoading(false);
    }
  };

  const markAttendance = async (regId: string) => {
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status: 'confirmed' })
        .eq("id", regId);

      if (error) throw error;
      
      toast({ title: "Attendance Marked", description: "Student successfully checked into the event!" });
      
      // Sync with Google Sheet
      const regToUpdate = registrations.find(r => r.id === regId);
      if (regToUpdate && participantData) {
        // Using participant profile email or the registration's contact_email
        updateAttendanceInSheet(regToUpdate.contact_email || participantData.email, regToUpdate.event_name);
      }

      // Update local state
      setRegistrations(prev => prev.map(reg => 
        reg.id === regId ? { ...reg, status: 'confirmed' } : reg
      ));
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setParticipantData(null);
    setRegistrations([]);
    // The Html5QrcodeScanner automatically resumes when element is re-rendered
    // But we need to force a re-mount or page refresh for the library's simplest usage
    window.location.reload(); 
  };

  if (isAdmin === null) return <div className="min-h-screen bg-black text-white p-10">Verifying access...</div>;
  if (isAdmin === false) return null;

  return (
    <div className="min-h-screen bg-black font-sans text-cream">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">
            <button onClick={() => navigate("/")} className="text-white/70 hover:text-white flex items-center gap-2 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </button>
            <div className="font-display text-2xl font-black text-white">பொறிக்களம் <span className="text-accent">Scanner</span></div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto p-6 mt-8">
        {!scanResult ? (
          <div className="bg-card-gradient border border-accent/20 rounded-xl p-8 shadow-gold text-center">
            <h2 className="text-2xl font-bold mb-6 font-display">Scan Digital Pass</h2>
            <div id="reader" className="overflow-hidden rounded-lg bg-white text-black mx-auto"></div>
            <p className="mt-6 text-muted-foreground">Point your camera at the participant's QR code.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {isLoading ? (
              <div className="text-center py-20 text-accent animate-pulse font-bold text-xl">Loading Participant Data...</div>
            ) : participantData ? (
              <>
                {/* Profile Card */}
                <div className="bg-card-gradient border border-accent/20 rounded-xl p-6 shadow-soft">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                      <User className="h-8 w-8 text-accent" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-display text-white">{participantData.display_name}</h2>
                      <p className="text-muted-foreground mt-1">{participantData.college} • {participantData.department}</p>
                      <p className="text-sm text-white/60 mt-1">{participantData.phone}</p>
                    </div>
                  </div>
                </div>

                {/* Registrations List */}
                <h3 className="text-xl font-bold font-display text-white flex items-center gap-2 mt-8">
                  <Calendar className="h-5 w-5 text-accent" /> Registered Events
                </h3>
                
                {registrations.length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center text-muted-foreground">
                    This user has not registered for any events yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {registrations.map((reg) => (
                      <div key={reg.id} className="bg-card-gradient border border-white/10 rounded-xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="inline-block px-2 py-1 bg-white/10 rounded text-xs font-bold text-accent mb-2 uppercase tracking-wider">
                            {reg.event_category}
                          </div>
                          <h4 className="text-lg font-bold text-white">{reg.event_name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">Status: <span className="text-white">{reg.status}</span></p>
                        </div>
                        
                        {reg.status === 'submitted' ? (
                          <button 
                            onClick={() => markAttendance(reg.id)}
                            className="bg-accent text-black font-bold py-2 px-6 rounded-lg hover:bg-accent/90 transition-colors w-full md:w-auto"
                          >
                            Mark Attendance
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 text-green-400 font-bold bg-green-400/10 px-4 py-2 rounded-lg">
                            <CheckCircle className="h-5 w-5" /> Checked In
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button 
                  onClick={resetScanner}
                  className="mt-8 w-full border border-accent text-accent font-bold py-3 px-6 rounded-lg hover:bg-accent/10 transition-colors"
                >
                  Scan Another Pass
                </button>
              </>
            ) : (
              <div className="text-center py-20 text-red-400">
                <ShieldAlert className="h-16 w-16 mx-auto mb-4" />
                <h2 className="text-xl font-bold">Failed to load data</h2>
                <button onClick={resetScanner} className="mt-6 border border-white/20 text-white py-2 px-6 rounded-lg hover:bg-white/10 transition-colors">Try Again</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
