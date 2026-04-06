
-- ============================================================
-- MIGRATION — Ajouter les nouvelles colonnes si elles manquent
-- À exécuter si vous avez déjà créé les tables sans ces colonnes
-- ============================================================
ALTER TABLE profils ADD COLUMN IF NOT EXISTS couleur_principale text DEFAULT '#1B2D4F';
ALTER TABLE profils ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS conditions_particulieres text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS est_modele boolean DEFAULT false;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS client_nom text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS client_adresse text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS client_email text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS date_validite integer DEFAULT 30;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS nb_ouvertures integer DEFAULT 0;
ALTER TABLE devis ADD COLUMN IF NOT EXISTS ouvert_le timestamp with time zone;

-- Nouvelles tables v2
CREATE TABLE IF NOT EXISTS clients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  nom text NOT NULL, email text, telephone text, adresse text, notes text,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Clients personnels" ON clients FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS signatures (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  devis_id uuid REFERENCES devis(id) ON DELETE CASCADE,
  signe_le timestamp with time zone DEFAULT now(),
  signature_data text, ip_client text, nom_signataire text
);
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS chantiers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  devis_id uuid REFERENCES devis(id), client_nom text, adresse text,
  statut text DEFAULT 'planifie', date_debut date, date_fin_prevue date,
  date_fin_reelle date, notes text,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Chantiers personnels" ON chantiers FOR ALL USING (auth.uid() = user_id);

-- Colonne client_id dans devis pour lier à la table clients
ALTER TABLE devis ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES clients(id);
