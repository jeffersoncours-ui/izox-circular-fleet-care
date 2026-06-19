-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'commercial', 'operateur', 'client');
CREATE TYPE public.type_client AS ENUM ('flotte', 'concession', 'vtc', 'autre');
CREATE TYPE public.palier_remise AS ENUM ('starter', 'pro', 'business', 'premium');
CREATE TYPE public.type_vehicule AS ENUM ('citadine', 'berline', 'suv_break', 'utilitaire');
CREATE TYPE public.statut_vehicule AS ENUM ('actif', 'en_attente_validation', 'remplace', 'archive');

-- ============================================
-- TABLE: entreprises
-- ============================================
CREATE TABLE public.entreprises (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             text NOT NULL,
  siret           text,
  adresse         text,
  ville           text,
  code_postal     text,
  email_contact   text,
  telephone       text,
  type_client     public.type_client NOT NULL DEFAULT 'flotte',
  palier_remise   public.palier_remise NOT NULL DEFAULT 'starter',
  commercial_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  compte_active   boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: profiles
-- ============================================
CREATE TABLE public.profiles (
  id             uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  prenom         text,
  nom            text,
  entreprise_id  uuid REFERENCES public.entreprises(id) ON DELETE SET NULL,
  role           public.app_role NOT NULL DEFAULT 'client',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- TABLE: user_roles (separate, recommended pattern)
-- ============================================
CREATE TABLE public.user_roles (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ============================================
-- TABLE: vehicules
-- ============================================
CREATE TABLE public.vehicules (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id        uuid NOT NULL REFERENCES public.entreprises(id) ON DELETE CASCADE,
  immatriculation      text NOT NULL,
  marque               text,
  modele               text,
  annee                int,
  couleur              text,
  kilometrage          int,
  photo_path           text,
  notes                text,
  type_vehicule        public.type_vehicule,
  statut               public.statut_vehicule NOT NULL DEFAULT 'actif',
  type_pack_souhaite   text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- SECURITY DEFINER FUNCTIONS (avoid RLS recursion)
-- ============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_entreprise(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entreprise_id FROM public.profiles WHERE id = _user_id LIMIT 1
$$;

-- ============================================
-- TRIGGER: auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, prenom, nom)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'prenom',
    NEW.raw_user_meta_data ->> 'nom'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ENABLE RLS
-- ============================================
ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS: user_roles
-- ============================================
CREATE POLICY "user_roles_self_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user_roles_staff_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'staff'));

-- ============================================
-- RLS: profiles
-- ============================================
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_staff_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "profiles_commercial_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'commercial')
    AND entreprise_id IN (
      SELECT id FROM public.entreprises WHERE commercial_id = auth.uid()
    )
  );

-- ============================================
-- RLS: entreprises
-- ============================================
CREATE POLICY "entreprises_admin_staff_all" ON public.entreprises
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "entreprises_commercial_select" ON public.entreprises
  FOR SELECT TO authenticated
  USING (commercial_id = auth.uid() AND public.has_role(auth.uid(), 'commercial'));

CREATE POLICY "entreprises_commercial_update" ON public.entreprises
  FOR UPDATE TO authenticated
  USING (commercial_id = auth.uid() AND public.has_role(auth.uid(), 'commercial'))
  WITH CHECK (commercial_id = auth.uid() AND public.has_role(auth.uid(), 'commercial'));

CREATE POLICY "entreprises_client_select" ON public.entreprises
  FOR SELECT TO authenticated
  USING (id = public.get_user_entreprise(auth.uid()));

-- ============================================
-- RLS: vehicules
-- ============================================
CREATE POLICY "vehicules_admin_staff_all" ON public.vehicules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "vehicules_client_select" ON public.vehicules
  FOR SELECT TO authenticated
  USING (entreprise_id = public.get_user_entreprise(auth.uid()));

CREATE POLICY "vehicules_client_insert" ON public.vehicules
  FOR INSERT TO authenticated
  WITH CHECK (entreprise_id = public.get_user_entreprise(auth.uid()));

CREATE POLICY "vehicules_client_update" ON public.vehicules
  FOR UPDATE TO authenticated
  USING (entreprise_id = public.get_user_entreprise(auth.uid()))
  WITH CHECK (entreprise_id = public.get_user_entreprise(auth.uid()));

CREATE POLICY "vehicules_commercial_select" ON public.vehicules
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'commercial')
    AND entreprise_id IN (
      SELECT id FROM public.entreprises WHERE commercial_id = auth.uid()
    )
  );

-- ============================================
-- STORAGE BUCKET: vehicules (private)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicules', 'vehicules', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: path = {entreprise_id}/{vehicule_id}/photo.jpg
CREATE POLICY "vehicules_storage_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'vehicules'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  )
  WITH CHECK (
    bucket_id = 'vehicules'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
  );

CREATE POLICY "vehicules_storage_client_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'vehicules'
    AND (storage.foldername(name))[1] = public.get_user_entreprise(auth.uid())::text
  );

CREATE POLICY "vehicules_storage_client_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'vehicules'
    AND (storage.foldername(name))[1] = public.get_user_entreprise(auth.uid())::text
  );

CREATE POLICY "vehicules_storage_client_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'vehicules'
    AND (storage.foldername(name))[1] = public.get_user_entreprise(auth.uid())::text
  );

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_entreprise ON public.profiles(entreprise_id);
CREATE INDEX idx_vehicules_entreprise ON public.vehicules(entreprise_id);
CREATE INDEX idx_entreprises_commercial ON public.entreprises(commercial_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);