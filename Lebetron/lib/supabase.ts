import { createClient } from "@supabase/supabase-js";

const supabaseUrl = 'https://fmdvxmgiwaugutyyajjq.supabase.com';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZtZHZ4bWdpd2F1Z3V0eXlhampxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc4MDUsImV4cCI6MjA4NDA3MzgwNX0.jE6a00kWIr5PC4CKjT8iMiUF8V7ai1ekJNg1PkuKZHE';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
