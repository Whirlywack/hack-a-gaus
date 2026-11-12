import { PlainScreen } from '../../ui/plain-screen'

// Later tickets add pirkimas/[id] for one tender; this is the section's place in the address space.
export default function Pirkimas() {
  return <PlainScreen meta="back.today" answer="tender.answer" note="tender.note" />
}
