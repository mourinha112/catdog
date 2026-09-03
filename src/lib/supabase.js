import { createClient } from '@supabase/supabase-js';

/*
 * Usado so para mandar a foto do produto para o Storage. Todo o resto
 * passa pela API. As chaves vem das variaveis de ambiente da Vercel.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !chave) {
  console.warn('Faltam VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY: o envio de fotos nao vai funcionar.');
}

export const supabase = createClient(url || 'https://exemplo.supabase.co', chave || 'sem-chave');
