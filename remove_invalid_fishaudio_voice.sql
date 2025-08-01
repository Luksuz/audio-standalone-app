-- Remove invalid Fish Audio voice that causes "Reference audio not found" error
DELETE FROM public.ai_voices 
WHERE voice_id = '5c744a47d71' AND provider = 'fishaudio';

-- Verify removal
SELECT * FROM public.ai_voices WHERE provider = 'fishaudio'; 