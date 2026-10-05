export const trackingActorsSql = `
ALTER TABLE tracking_events
 ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'visitor'
 CHECK (actor_type IN ('visitor', 'admin'));
ALTER TABLE tracking_events
 ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'legacy'
 CHECK (source IN ('legacy', 'public', 'server'));
ALTER TABLE tracking_events ADD CONSTRAINT tracking_events_trust_boundary
 CHECK ((actor_type = 'admin' AND source = 'server') OR
        (actor_type = 'visitor' AND source IN ('legacy', 'public')));
`;
