/**
 * Redirect: Einziges Dashboard ist /dashboard (trades-basiert).
 */

import { redirect } from 'next/navigation';

export default function DashboardV2Page() {
  redirect('/dashboard');
}
