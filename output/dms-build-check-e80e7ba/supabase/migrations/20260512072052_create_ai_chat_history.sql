CREATE TABLE IF NOT EXISTS public.ai_chat_history (
  username TEXT PRIMARY KEY,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage AI chat history"
ON public.ai_chat_history
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_chat_history TO service_role;
