
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://ywxkcsgqtnhwosewmnnw.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3eGtjc2dxdG5od29zZXdtbm53Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5MTk5MjgsImV4cCI6MjA1NTQ5NTkyOH0.-a7yAaUvZdQIt9du4oqONOjzt3-NOIjGEfiOeA6HqlU";

export const supabase = createClient(supabaseUrl, supabaseKey);
