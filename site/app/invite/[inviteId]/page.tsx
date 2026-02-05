import AcceptInviteClient from './client'

export async function generateStaticParams() {
  return [{ inviteId: 'placeholder' }]
}

export const dynamicParams = false

export default function InvitePage() {
  return <AcceptInviteClient />
}
