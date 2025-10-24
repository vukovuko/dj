import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  plugins: [usernameClient()],
})

// Export commonly used hooks and methods
export const { useSession, signIn, signOut } = authClient

// Type inference for additional user fields
export type Session = typeof authClient.$Infer.Session.session
