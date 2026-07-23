import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import ws from 'ws';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function createAdminUser() {
  console.log("Tentando criar um usuário admin...");
  
  const email = "admin@voyageflow.com";
  const password = "password123";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    console.error("Erro ao criar usuário:", error.message);
    if (error.message.includes("already registered")) {
      console.log(`O usuário ${email} já existe. Tente logar com a senha: ${password}`);
    }
  } else {
    console.log("=========================================");
    console.log("✅ Usuário criado com sucesso!");
    console.log(`   E-mail: ${email}`);
    console.log(`   Senha:  ${password}`);
    console.log("=========================================");
    console.log("O primeiro usuário cadastrado vira admin automaticamente pelo seu trigger rbac_migration.sql.");
  }
}

createAdminUser();
