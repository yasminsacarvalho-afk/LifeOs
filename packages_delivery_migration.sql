ALTER TABLE packages
ADD COLUMN delivery_person_id UUID REFERENCES company_contacts(id) ON DELETE SET NULL,
ADD COLUMN delivery_fee NUMERIC DEFAULT 0,
ADD COLUMN delivery_paid BOOLEAN DEFAULT false;
