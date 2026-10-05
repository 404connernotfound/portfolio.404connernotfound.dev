// SQLite historically accepts NULL for these flags and ordering values. Preserve
// those values during transfer instead of substituting defaults or rejecting rows.
export const sqliteNullabilitySql = `
ALTER TABLE stack_items ALTER COLUMN sort DROP NOT NULL;
ALTER TABLE work_items ALTER COLUMN featured DROP NOT NULL, ALTER COLUMN sort DROP NOT NULL;
ALTER TABLE posts ALTER COLUMN draft DROP NOT NULL, ALTER COLUMN featured DROP NOT NULL;
ALTER TABLE assets ALTER COLUMN public DROP NOT NULL;
ALTER TABLE testimonials ALTER COLUMN approved DROP NOT NULL;
ALTER TABLE crisis_items ALTER COLUMN sort DROP NOT NULL;
ALTER TABLE footer_links ALTER COLUMN external DROP NOT NULL, ALTER COLUMN sort DROP NOT NULL;
`;
