CREATE TABLE public.events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    pillar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone can read events
CREATE POLICY "Anyone can view events"
ON public.events
FOR SELECT
TO public
USING (true);

-- Only admins can manage events
CREATE POLICY "Admins can insert events"
ON public.events
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update events"
ON public.events
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete events"
ON public.events
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

-- Insert the default events so the website doesn't break
INSERT INTO public.events (key, title, description, category, pillar) VALUES
('core-ideathon', 'Ideathon 24H', 'A 24-hour rapid prototyping challenge to solve industry-defined problems. Bring your team, code through the night, and present a working prototype.', 'Core Experience', 'BUILD'),
('core-pitch-fest', 'Pitch Fest', 'Present your startup ideas or product concepts to a panel of founders and investors. Focus on viability, business model, and clarity of thought.', 'Core Experience', 'THINK'),
('core-hardware-hack', 'Hardware Hack', 'Build physical solutions for real-world problems. Components will be provided; you bring the design and execution logic.', 'Core Experience', 'MAKE'),
('coding-algo-sprint', 'Algo Sprint', 'Competitive programming contest focusing on data structures and advanced algorithms under strict time constraints.', 'Coding', NULL),
('coding-debug-duel', 'Debug Duel', 'Find and fix hidden bugs in complex, undocumented codebases faster than your opponent.', 'Coding', NULL),
('coding-web-craft', 'Web Craft', 'A frontend challenge to build the most accessible, performant, and pixel-perfect UI from a Figma file.', 'Coding', NULL),
('design-ui-ux-marathon', 'UI/UX Marathon', 'Solve a user experience problem from research to high-fidelity prototyping within 6 hours.', 'Design', NULL),
('design-brand-identity', 'Brand Identity', 'Create a complete brand identity package including logo, typography, and marketing assets for a fictional company.', 'Design', NULL),
('engineering-robo-wars', 'Robo Wars', 'Design and battle combat robots in a reinforced arena. Weight limits and weapon restrictions apply.', 'Engineering', NULL),
('engineering-circuit-design', 'Circuit Design', 'Solve complex logic and power distribution problems using basic electronic components.', 'Engineering', NULL);
