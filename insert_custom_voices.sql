-- Insert custom voices into ai_voices table
-- ElevenLabs voices
INSERT INTO public.ai_voices (voice_id, name, provider) VALUES
('JIiiDgK48RxyJcoMG8V9', 'Neil - cheerful upbeat youth', 'elevenlabs'),
('UgBBYS2sOqTuMpoF3BR0', 'Mark - Natural Conversations', 'elevenlabs'),
('x8xv0H8Ako6Iw3cKXLoC', 'Haven Sands', 'elevenlabs'),
('Qe9WSybioZxssVEwlBSo', 'Vincent - Deep & Relaxing', 'elevenlabs'),
('t8Np6Kzi4OFDJT2X3tfD', 'Victor the VSL video voice guy', 'elevenlabs'),
('tnSpp4vdxKPjI9w0GnoV', 'Hope - upbeat and clear', 'elevenlabs'),
('56AoDkrOh6qfVPDXZ7Pt', 'Cassidy', 'elevenlabs'),
('9Ft9sm9dzvprPILZmLJl', 'Patrick International', 'elevenlabs'),
('Fahco4VZzobUeiPqni1S', 'Archer - Conversational', 'elevenlabs');

-- Fish Audio voices
INSERT INTO public.ai_voices (voice_id, name, provider) VALUES
('5c744a47d71', 'Jean', 'fishaudio');

-- Verify the insertions
SELECT * FROM public.ai_voices ORDER BY created_at DESC; 