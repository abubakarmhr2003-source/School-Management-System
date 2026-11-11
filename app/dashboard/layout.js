import { redirect } from 'next/navigation';
import { requireUser, logoUrl } from '@/lib/auth';
import SideNav from '@/components/SideNav';
const D = '/dashboard';
const ANN = ['Announcements', D + '/announcements'];
const MENU = {
  admin: [['Dashboard', D], ['Classes', D + '/classes'], ['Subjects', D + '/subjects'], ['Students', D + '/students'], ['Teachers', D + '/teachers'], ['Accountants', D + '/staff'], ['Attendance', D + '/attendance'], ['Exams & Results', D + '/exams'], ['Fees', D + '/fees'], ['Timetable', D + '/timetable'], ANN, ['School settings', D + '/settings']],
  teacher: [['Dashboard', D], ['Attendance', D + '/attendance'], ['Exams & Results', D + '/exams'], ['Timetable', D + '/timetable'], ANN],
  accountant: [['Dashboard', D], ['Fees', D + '/fees'], ANN],
  parent: [['Dashboard', D], ['Attendance', D + '/my/attendance'], ['Results', D + '/my/results'], ['Fees', D + '/my/fees'], ['Timetable', D + '/timetable'], ANN],
};
export default async function Layout({ children }) {
  const u = await requireUser();
  if (u.role === 'superadmin') redirect('/platform');
  return (
    <div className="shell">
      <SideNav school={u.school_name} logo={logoUrl(u)} items={MENU[u.role] || [['Dashboard', D]]} />
      <div className="content"><div className="page">{children}</div></div>
    </div>
  );
}
