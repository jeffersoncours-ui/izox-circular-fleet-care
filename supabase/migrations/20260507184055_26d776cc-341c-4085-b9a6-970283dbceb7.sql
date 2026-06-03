ALTER TABLE factures DISABLE TRIGGER trg_factures_protect_immuable;
ALTER TABLE factures DISABLE TRIGGER trg_factures_no_delete;

DELETE FROM factures
WHERE periode_debut IN ('2026-05-01', '2027-01-01');

ALTER TABLE factures ENABLE TRIGGER trg_factures_protect_immuable;
ALTER TABLE factures ENABLE TRIGGER trg_factures_no_delete;

CREATE SEQUENCE IF NOT EXISTS seq_facture_b2b_2027 START 1 INCREMENT 1 MINVALUE 1 MAXVALUE 999999 NO CYCLE;
ALTER SEQUENCE seq_facture_b2b_2026 RESTART WITH 1;
ALTER SEQUENCE seq_facture_b2b_2027 RESTART WITH 1;

DELETE FROM admin_actions_log WHERE action IN ('emission_facture','generation_facture_brouillon');