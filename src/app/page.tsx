import { redirect } from 'next/navigation'

// There is no home page. Signed out opens Pradžia; signed in will open
// Šiandien once sign-in exists (a later ticket).
export default function Root() {
  redirect('/pradzia')
}
