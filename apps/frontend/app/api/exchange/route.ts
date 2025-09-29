import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 })
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const shared = process.env.EXCHANGE_SHARED_SECRET
  if (!shared) {
    return new Response(JSON.stringify({ message: 'Server misconfiguration' }), { status: 500 })
  }

  const res = await fetch(`${backendUrl}/auth/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Exchange-Secret': shared,
    },
    body: JSON.stringify({ userId: session.user.id, email: session.user.email }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.status })
}
