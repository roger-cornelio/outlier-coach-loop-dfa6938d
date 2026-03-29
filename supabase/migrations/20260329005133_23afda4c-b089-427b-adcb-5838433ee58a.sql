UPDATE public.global_exercises 
SET aliases = array_cat(aliases, ARRAY['kb step box', 'db step box', 'step box', 'kb step up', 'db step up', 'bb step up'])
WHERE id = 'cc767e13-b144-4bfe-b599-92fd14f24dc0';