CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Todos podem ler suas próprias roles ou de todos (necessário para a interface)
CREATE POLICY "Allow public select on user_roles" ON user_roles FOR SELECT USING (true);

-- Apenas admins podem alterar cargos
CREATE POLICY "Allow update for admins" ON user_roles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Apenas admins podem inserir (se não for via trigger)
CREATE POLICY "Allow insert for admins" ON user_roles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Deletar
CREATE POLICY "Allow delete for admins" ON user_roles FOR DELETE USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Função e Trigger para criar o perfil automaticamente no cadastro
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- O primeiro usuário a se cadastrar vira admin automaticamente, os demais viram operator
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles (user_id, email, role)
    VALUES (new.id, new.email, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, email, role)
    VALUES (new.id, new.email, 'operator');
  END IF;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
