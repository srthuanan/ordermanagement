-- Migration to add ma_amis to donhang table
ALTER TABLE public.donhang
ADD COLUMN IF NOT EXISTS ma_amis text;
