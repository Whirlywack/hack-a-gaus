import { PlainScreen } from '../ui/plain-screen'

// An address that leads nowhere, in Lithuanian instead of Next.js's English default.
export default function NotFound() {
  return <PlainScreen answer="notFound.answer" note="notFound.note" />
}
