import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, ArrowLeft, Trash2, Edit2, Plus } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

export default function ManageEvents() {
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [editingEvent, setEditingEvent] = useState<Partial<Event> | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from("events").select("*").order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setEvents(data || []);
    }
    setIsLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent?.key || !editingEvent?.title || !editingEvent?.category) {
      toast({ title: "Error", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    
    // Auto-generate key if not provided properly (basic fallback)
    const eventKey = editingEvent.key.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const payload = {
      key: eventKey,
      title: editingEvent.title,
      description: editingEvent.description || "",
      category: editingEvent.category,
      pillar: editingEvent.pillar || null
    };

    let error;
    if (editingEvent.id) {
      // Update
      const res = await supabase.from("events").update(payload).eq("id", editingEvent.id);
      error = res.error;
    } else {
      // Insert
      const res = await supabase.from("events").insert(payload);
      error = res.error;
    }

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Event saved successfully." });
      setEditingEvent(null);
      fetchEvents();
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this event? This will also affect existing registrations for this event.")) return;
    
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Event has been removed." });
      setEvents(events.filter(e => e.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-8 mt-10">
        
        <div className="flex items-center justify-between">
          <div>
            <Link to="/dashboard" className="text-muted-foreground hover:text-accent flex items-center gap-2 text-sm mb-4">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
            <h1 className="font-display text-4xl font-bold text-cream">Manage Events</h1>
            <p className="text-muted-foreground mt-2">Add, edit, or remove events for the platform.</p>
          </div>
          <Button onClick={() => setEditingEvent({ key: "", title: "", description: "", category: "Core Experience", pillar: "" })} className="gap-2 font-bold bg-accent text-black hover:bg-accent/80">
            <Plus className="w-4 h-4" /> Add Event
          </Button>
        </div>

        {editingEvent && (
          <div className="bg-card-gradient border border-accent/20 p-6 rounded-lg shadow-soft mb-8">
            <h2 className="text-xl font-bold text-cream mb-4">{editingEvent.id ? "Edit Event" : "Create New Event"}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-1 block">Title *</label>
                  <Input 
                    value={editingEvent.title || ""} 
                    onChange={e => setEditingEvent({...editingEvent, title: e.target.value, key: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")})} 
                    placeholder="e.g. Ideathon 24H" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-1 block">Unique Key *</label>
                  <Input 
                    value={editingEvent.key || ""} 
                    onChange={e => setEditingEvent({...editingEvent, key: e.target.value})} 
                    placeholder="e.g. core-ideathon" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-1 block">Category *</label>
                  <Input 
                    value={editingEvent.category || ""} 
                    onChange={e => setEditingEvent({...editingEvent, category: e.target.value})} 
                    placeholder="e.g. Core Experience, Coding, Design" 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground mb-1 block">Pillar (Optional)</label>
                  <Input 
                    value={editingEvent.pillar || ""} 
                    onChange={e => setEditingEvent({...editingEvent, pillar: e.target.value})} 
                    placeholder="e.g. BUILD, DESIGN" 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-muted-foreground mb-1 block">Description *</label>
                <Textarea 
                  value={editingEvent.description || ""} 
                  onChange={e => setEditingEvent({...editingEvent, description: e.target.value})} 
                  placeholder="Event description..." 
                  required 
                  className="min-h-[100px]"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="ghost" onClick={() => setEditingEvent(null)}>Cancel</Button>
                <Button type="submit" disabled={isSaving} className="bg-accent text-black font-bold">
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Save Event
                </Button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-background/50 border border-accent/15 rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-10 text-center flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
          ) : events.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">No events found. Please add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-card-gradient text-xs uppercase tracking-wider text-soft-gold border-b border-accent/15">
                  <tr>
                    <th className="p-4">Title</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Key</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-accent/10">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-accent/5 transition-colors">
                      <td className="p-4 font-bold text-cream">{event.title}</td>
                      <td className="p-4 text-muted-foreground">{event.category}</td>
                      <td className="p-4 text-muted-foreground font-mono text-xs">{event.key}</td>
                      <td className="p-4 flex gap-2 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => setEditingEvent(event)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(event.id)} className="h-8 w-8 text-destructive hover:text-red-400 hover:bg-red-900/30">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
