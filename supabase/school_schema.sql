-- Tables created inside every school's own schema (school_<id>).
-- The app runs this with: SET search_path TO school_<id>, public

create table classes (
  id         integer generated always as identity primary key,
  school_id  integer not null references public.schools(id),
  name       text not null,
  unique (school_id, name)
);

create table sections (
  id         integer generated always as identity primary key,
  school_id  integer not null references public.schools(id),
  class_id   integer not null references classes(id),
  name       text not null,
  unique (class_id, name)
);
create index sections_school_idx on sections (school_id);

create table students (
  id           integer generated always as identity primary key,
  school_id    integer not null references public.schools(id),
  class_id     integer not null references classes(id),
  section_id   integer not null references sections(id),
  roll_no      text,
  name         text not null,
  father_name  text,
  phone        text,
  photo        text, -- small JPEG as a data: URL (resized in the browser before upload)
  created_at   timestamptz not null default now()
);
create index students_section_idx on students (school_id, section_id);
create index students_class_idx on students (class_id);

create table subjects (
  id         integer generated always as identity primary key,
  school_id  integer not null references public.schools(id),
  name       text not null,
  unique (school_id, name)
);

create table teachers (
  id             integer generated always as identity primary key,
  school_id      integer not null references public.schools(id),
  name           text not null,
  phone          text,
  qualification  text
);
create index teachers_school_idx on teachers (school_id);

create table assignments (
  id          integer generated always as identity primary key,
  school_id   integer not null references public.schools(id),
  teacher_id  integer not null references teachers(id) on delete cascade,
  section_id  integer not null references sections(id),
  subject_id  integer not null references subjects(id),
  unique (section_id, subject_id)
);
create index assignments_teacher_idx on assignments (teacher_id);

create table attendance (
  id          integer generated always as identity primary key,
  school_id   integer not null references public.schools(id),
  student_id  integer not null references students(id) on delete cascade,
  date        text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  status      text not null check (status in ('P','A','L')),
  unique (student_id, date)
);

create table exams (
  id           integer generated always as identity primary key,
  school_id    integer not null references public.schools(id),
  name         text not null,
  total_marks  integer not null default 100 check (total_marks > 0),
  unique (school_id, name)
);

create table marks (
  id          integer generated always as identity primary key,
  school_id   integer not null references public.schools(id),
  exam_id     integer not null references exams(id) on delete cascade,
  student_id  integer not null references students(id) on delete cascade,
  subject_id  integer not null references subjects(id),
  obtained    numeric(7,2) not null check (obtained >= 0),
  unique (exam_id, student_id, subject_id)
);
create index marks_student_idx on marks (student_id);
create index marks_subject_idx on marks (subject_id);

-- Teacher's remark for one student in one exam (printed on the report card)
create table exam_remarks (
  exam_id     integer not null references exams(id) on delete cascade,
  student_id  integer not null references students(id) on delete cascade,
  school_id   integer not null references public.schools(id),
  remark      text not null check (char_length(remark) <= 200),
  primary key (exam_id, student_id)
);

create table class_fees (
  class_id     integer primary key references classes(id) on delete cascade,
  school_id    integer not null references public.schools(id),
  monthly_fee  numeric(12,2) not null default 0 check (monthly_fee >= 0)
);

create table vouchers (
  id          integer generated always as identity primary key,
  school_id   integer not null references public.schools(id),
  student_id  integer not null references students(id) on delete cascade,
  month       text not null check (month ~ '^\d{4}-\d{2}$'),
  amount      numeric(12,2) not null check (amount >= 0),
  unique (student_id, month)
);
create index vouchers_month_idx on vouchers (school_id, month);

create table payments (
  id          integer generated always as identity primary key,
  school_id   integer not null references public.schools(id),
  voucher_id  integer not null references vouchers(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  paid_on     text not null
);
create index payments_voucher_idx on payments (voucher_id);

create table timetable (
  id          integer generated always as identity primary key,
  school_id   integer not null references public.schools(id),
  section_id  integer not null references sections(id),
  day         integer not null check (day between 1 and 7),
  period      integer not null check (period between 1 and 12),
  subject_id  integer not null references subjects(id),
  unique (section_id, day, period)
);
create index timetable_subject_idx on timetable (subject_id);

create table announcements (
  id         integer generated always as identity primary key,
  school_id  integer not null references public.schools(id),
  title      text not null,
  body       text,
  posted_on  text not null
);
create index announcements_school_idx on announcements (school_id, id desc);

create table teacher_users (
  teacher_id  integer primary key references teachers(id) on delete cascade,
  user_id     integer not null unique references public.users(id) on delete cascade
);

create table parent_students (
  user_id     integer not null references public.users(id) on delete cascade,
  student_id  integer not null references students(id) on delete cascade,
  primary key (user_id, student_id)
);
create index parent_students_student_idx on parent_students (student_id);


-- Nothing here may be reached through Supabase's public REST/GraphQL API.
alter table classes enable row level security;
alter table sections enable row level security;
alter table students enable row level security;
alter table subjects enable row level security;
alter table teachers enable row level security;
alter table assignments enable row level security;
alter table attendance enable row level security;
alter table exams enable row level security;
alter table marks enable row level security;
alter table exam_remarks enable row level security;
alter table class_fees enable row level security;
alter table vouchers enable row level security;
alter table payments enable row level security;
alter table timetable enable row level security;
alter table announcements enable row level security;
alter table teacher_users enable row level security;
alter table parent_students enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute format('revoke all on all tables in schema %I from anon', current_schema());
    execute format('revoke all on all sequences in schema %I from anon', current_schema());
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute format('revoke all on all tables in schema %I from authenticated', current_schema());
    execute format('revoke all on all sequences in schema %I from authenticated', current_schema());
  end if;
end $$;
