import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  // baseURL auto-detects from window.location.origin - no need to set explicitly
  plugins: [usernameClient()],
})

// Export commonly used hooks and methods
export const { useSession, signIn, signOut } = authClient

// Type inference for additional user fields
export type Session = typeof authClient.$Infer.Session.session
