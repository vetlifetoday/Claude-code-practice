-- =============================================================================
-- VETLIFE CRM — sample data (optional)
-- Ten fictional contacts so you can see the app working. All names, emails
-- (example.org) and phone numbers (555) are made up. Safe to skip in production,
-- or archive these contacts later from the app.
-- =============================================================================

insert into public.contacts
  (id, kind, first_name, last_name, email, phone, address, city, state, zip, company, title, years_of_service, notes, veteran_id, organization_id)
values
  ('00000000-0000-4000-8000-000000000101', 'organization', null, null, 'info@harborpointmarine.example.org', '(727) 555-0140',
   '400 Harbor Point Dr', 'Clearwater', 'FL', '33767', 'Harbor Point Marine', null, null,
   'Local marine dealer. Donated the boat for the 2026 Boat Raffle.', null, null),

  ('00000000-0000-4000-8000-000000000102', 'organization', null, null, 'community@suncoastfcu.example.org', '(813) 555-0199',
   '1200 Kennedy Blvd', 'Tampa', 'FL', '33602', 'Suncoast Community Credit Union', null, null,
   'Corporate sponsor. Prefers quarterly impact updates.', null, null),

  ('00000000-0000-4000-8000-000000000001', 'person', 'Marcus', 'Bell', 'marcus.bell@example.org', '(727) 555-0101',
   '1842 Pinewood Ave', 'St. Petersburg', 'FL', '33704', null, null, 12,
   'Former Army infantry NCO. Interested in the peer mentor program.', null, null),

  ('00000000-0000-4000-8000-000000000002', 'person', 'Angela', 'Bell', 'angela.bell@example.org', '(727) 555-0102',
   '1842 Pinewood Ave', 'St. Petersburg', 'FL', '33704', null, null, null,
   'Spouse of Marcus. Helps coordinate Vet Fest volunteers.', '00000000-0000-4000-8000-000000000001', null),

  ('00000000-0000-4000-8000-000000000003', 'person', 'Diego', 'Ramirez', 'd.ramirez@example.org', '(813) 555-0133',
   '77 Bayshore Ct', 'Tampa', 'FL', '33606', 'Suncoast Community Credit Union', 'Branch Manager', 6,
   'Navy veteran; manages the Bayshore branch and is our main contact there.', null, '00000000-0000-4000-8000-000000000102'),

  ('00000000-0000-4000-8000-000000000004', 'person', 'Tanya', 'Whitfield', 'tanya.whitfield@example.org', '(904) 555-0177',
   '903 Riverside Ave', 'Jacksonville', 'FL', '32204', null, null, 22,
   'Retired Air Force. Serves on the board (Treasurer).', null, null),

  ('00000000-0000-4000-8000-000000000005', 'person', 'Kevin', 'O''Connor', 'kevin.oconnor@example.org', '(352) 555-0110',
   '12 Live Oak Ln', 'Ocala', 'FL', '34471', null, null, 4,
   'Marine Corps veteran. Registered for the Golf Event.', null, null),

  ('00000000-0000-4000-8000-000000000006', 'person', 'Lily', 'Bell', null, null,
   '1842 Pinewood Ave', 'St. Petersburg', 'FL', '33704', null, null, null,
   'Daughter of Marcus and Angela.', '00000000-0000-4000-8000-000000000001', null),

  ('00000000-0000-4000-8000-000000000007', 'person', 'Rachel', 'Nguyen', 'rnguyen@example.org', '(407) 555-0150',
   '450 Lake Eola Dr', 'Orlando', 'FL', '32801', 'WVET Community Radio', 'Producer', null,
   'Produces the weekly veterans radio segment.', null, null),

  ('00000000-0000-4000-8000-000000000008', 'person', 'Samuel', 'Okafor', 'sam.okafor@example.org', '(912) 555-0164',
   '18 Abercorn St', 'Savannah', 'GA', '31401', null, null, 8,
   'Coast Guard veteran. Prospective monthly donor met at Harvest for Heroes.', null, null);

-- Category tags
insert into public.contact_categories (contact_id, category_id, subcategory_id)
select t.contact_id::uuid, c.id, s.id
from (values
  ('00000000-0000-4000-8000-000000000101', 'business',        null),
  ('00000000-0000-4000-8000-000000000101', 'sponsor',         'Event'),
  ('00000000-0000-4000-8000-000000000101', 'exhibitor',       null),
  ('00000000-0000-4000-8000-000000000102', 'business',        null),
  ('00000000-0000-4000-8000-000000000102', 'sponsor',         'Battle Buddy'),
  ('00000000-0000-4000-8000-000000000102', 'donor',           'Monthly'),
  ('00000000-0000-4000-8000-000000000001', 'veteran',         'Army'),
  ('00000000-0000-4000-8000-000000000001', 'volunteer',       null),
  ('00000000-0000-4000-8000-000000000001', 'participant',     'Vet Fest 2026'),
  ('00000000-0000-4000-8000-000000000002', 'military_family', 'Spouse'),
  ('00000000-0000-4000-8000-000000000002', 'volunteer',       null),
  ('00000000-0000-4000-8000-000000000003', 'veteran',         'Navy'),
  ('00000000-0000-4000-8000-000000000003', 'donor',           'One Time'),
  ('00000000-0000-4000-8000-000000000004', 'veteran',         'Air Force'),
  ('00000000-0000-4000-8000-000000000004', 'board_member',    null),
  ('00000000-0000-4000-8000-000000000004', 'donor',           'Monthly'),
  ('00000000-0000-4000-8000-000000000005', 'veteran',         'Marine Corps'),
  ('00000000-0000-4000-8000-000000000005', 'participant',     'Golf Event 2026'),
  ('00000000-0000-4000-8000-000000000006', 'military_family', 'Child'),
  ('00000000-0000-4000-8000-000000000007', 'media',           null),
  ('00000000-0000-4000-8000-000000000007', 'sponsor',         'Radio Show'),
  ('00000000-0000-4000-8000-000000000008', 'veteran',         'Coast Guard'),
  ('00000000-0000-4000-8000-000000000008', 'prospect',        null),
  ('00000000-0000-4000-8000-000000000008', 'participant',     'Harvest for Heroes 2026')
) as t(contact_id, category_key, subcategory_name)
join public.categories c on c.system_key = t.category_key
left join public.subcategories s on s.category_id = c.id and s.name = t.subcategory_name;

-- A few timeline entries
insert into public.interactions (contact_id, type, occurred_on, summary) values
  ('00000000-0000-4000-8000-000000000001', 'call',    current_date - 20, 'Intro call. Marcus wants to help with the peer mentor program and volunteer at Vet Fest.'),
  ('00000000-0000-4000-8000-000000000001', 'event',   current_date - 5,  'Volunteered at the Vet Fest setup crew. Great energy, brought his family.'),
  ('00000000-0000-4000-8000-000000000101', 'meeting', current_date - 30, 'Met with owner about donating the raffle boat. Agreed to a 2026 model center console.'),
  ('00000000-0000-4000-8000-000000000102', 'email',   current_date - 12, 'Sent Q3 impact report. They asked about Battle Buddy sponsorship renewal.'),
  ('00000000-0000-4000-8000-000000000004', 'meeting', current_date - 3,  'Board meeting: reviewed 2027 event calendar and budget.'),
  ('00000000-0000-4000-8000-000000000008', 'note',    current_date - 1,  'Follow up next week about the monthly giving program.');
