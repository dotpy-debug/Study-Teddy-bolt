# Better Auth Complete Setup Guide

## Initial Setup

### 1. Install Package
```bash
npm install better-auth
```
*Note: Install in both client and server if they're separate.*

### 2. Set Environment Variables
Create `.env` file in your project root:
```env
# Core configuration
BETTER_AUTH_SECRET=your-generated-secret-key
BETTER_AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### 3. Create Auth Instance
Create `auth.ts` in `/lib`, `/utils`, or project root:
```typescript
import { betterAuth } from "better-auth"
import { passkey } from "better-auth/plugins"
import { magicLink } from "better-auth/plugins"

export const auth = betterAuth({
  // Database configuration
  database: {
    provider: "sqlite", // or "postgres", "mysql"
    url: "sqlite:database.db" // or your DB connection string
  },
  
  // Email/Password authentication
  emailAndPassword: {
    enabled: true
  },
  
  // Social providers
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }
  },
  
  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24 // update every 24 hours
  },
  
  // Plugins
  plugins: [
    passkey({
      rpName: "Your App Name",
      rpID: "localhost", // your domain in production
      origin: "http://localhost:3000"
    }),
    magicLink({
      sendMagicLink: async ({ email, token, url }) => {
        // Implement your email sending logic here
        await sendEmail({
          to: email,
          subject: "Sign in link",
          html: `<a href="${url}">Click to sign in</a>`
        })
      }
    })
  ]
})
```

### 4. Create Database Tables
Use Better Auth CLI:
```bash
npx better-auth generate  # generates migration file
npx better-auth migrate   # applies migration (Kysely only)
```

### 5. Mount API Handler
Create route handler at `/api/auth/*`:

**Next.js App Router :**
```typescript
import { auth } from "@/lib/auth"

export const { GET, POST } = auth.handler
```

**Express/Node.js:**
```typescript
app.all("/api/auth/*", (req, res) => {
  return auth.handler(req, res)
})
```

### 6. Create Client Instance
```typescript
// lib/auth-client.ts
import { createAuthClient } from "better-auth/react" // or "better-auth/vue", etc.

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000/api/auth" // adjust for production
})
```

## OAuth Setup

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy Client ID and Client Secret to `.env`

### GitHub OAuth
1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create New OAuth App
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Client Secret to `.env`

## Authentication Methods

### Email/Password
```typescript
// Sign up
await authClient.signUp.email({
  email: "user@example.com",
  password: "password123",
  name: "User Name" // optional
})

// Sign in
await authClient.signIn.email({
  email: "user@example.com",
  password: "password123"
})
```

### Social Login
```typescript
// Google sign in
await authClient.signIn.social({
  provider: "google"
})

// GitHub sign in
await authClient.signIn.social({
  provider: "github"
})
```

### Passkeys
```typescript
// Register new user with passkey
await authClient.signUp.passkey({
  email: "user@example.com",
  name: "User Name"
})

// Add passkey to existing account
await authClient.passkey.addPasskey()

// Sign in with passkey
await authClient.signIn.passkey({
  email: "user@example.com" // optional
})
```

### Magic Links
```typescript
// Send magic link
await authClient.signIn.magicLink({
  email: "user@example.com"
})
```

## Route Protection

### Server-Side Middleware (Next.js)
```typescript
// middleware.ts
import { auth } from "@/lib/auth"

export async function middleware(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers
  })
  
  if (!session) {
    return Response.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/protected/:path*"]
}
```

### Client-Side Protection (React)
```tsx
// components/ProtectedRoute.tsx
import { useSession } from "better-auth/react"
import { Navigate } from "react-router-dom"

export function ProtectedRoute({ children }) {
  const { data: session, isPending } = useSession()
  
  if (isPending) return <div>Loading...</div>
  if (!session) return <Navigate to="/login" />
  
  return children
}

// Usage
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

## Session Management

### Using Hooks (React)
```tsx
import { useSession } from "better-auth/react"

function Profile() {
  const { data: session, isPending, error } = useSession()
  
  if (isPending) return <div>Loading...</div>
  if (error) return <div>Error loading session</div>
  
  if (session) {
    return (
      <div>
        <p>Welcome, {session.user.email}</p>
        <p>User ID: {session.user.id}</p>
      </div>
    )
  }
  
  return <div>Not logged in</div>
}
```

### Direct API Calls
```typescript
// Get current session
const session = await authClient.getSession()

// Update user information
await authClient.updateUser({
  name: "New Name",
  email: "newemail@example.com"
})

// Force refresh session
await authClient.refreshSession()

// Sign out
await authClient.signOut()
```

### Session Events
```typescript
// Listen to session changes
authClient.onSessionChange((session) => {
  if (!session) {
    // User logged out
    window.location.href = "/login"
  } else {
    // User logged in or session updated
    console.log("Session updated:", session)
  }
})
```

## Complete Implementation Example

### Login Component
```tsx
import { useState } from "react"
import { useSession } from "better-auth/react"
import { authClient } from "@/lib/auth-client"

export function AuthComponent() {
  const { data: session } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  
  const handleEmailSignIn = async () => {
    await authClient.signIn.email({ email, password })
  }
  
  const handlePasskey = async () => {
    if (!session) {
      await authClient.signUp.passkey({ email, name: "User" })
    } else {
      await authClient.passkey.addPasskey()
    }
  }
  
  const handleMagicLink = async () => {
    await authClient.signIn.magicLink({ email })
  }
  
  if (session) {
    return (
      <div>
        <h2>Welcome, {session.user.email}!</h2>
        <button onClick={() => authClient.signOut()}>
          Sign Out
        </button>
        <button onClick={() => authClient.passkey.addPasskey()}>
          Add Passkey
        </button>
      </div>
    )
  }
  
  return (
    <div>
      <h2>Sign In</h2>
      
      {/* Email/Password Form */}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleEmailSignIn}>
        Sign In with Email
      </button>
      
      {/* Alternative Methods */}
      <button onClick={handleMagicLink}>
        Send Magic Link
      </button>
      <button onClick={handlePasskey}>
        Sign In with Passkey
      </button>
      
      {/* Social Logins */}
      <button onClick={() => authClient.signIn.social({ provider: "google" })}>
        Sign In with Google
      </button>
      <button onClick={() => authClient.signIn.social({ provider: "github" })}>
        Sign In with GitHub
      </button>
    </div>
  )
}
```

### Dashboard Component
```tsx
import { useSession } from "better-auth/react"
import { authClient } from "@/lib/auth-client"

export function Dashboard() {
  const { data: session } = useSession()
  
  if (!session) {
    return <div>Access denied. Please log in.</div>
  }
  
  return (
    <div>
      <h1>Dashboard</h1>
      <p>User: {session.user.email}</p>
      <p>ID: {session.user.id}</p>
      <p>Session expires: {new Date(session.expiresAt).toLocaleString()}</p>
      
      <button onClick={() => authClient.refreshSession()}>
        Refresh Session
      </button>
      <button onClick={() => authClient.signOut()}>
        Sign Out
      </button>
    </div>
  )
}
```

## Additional Plugins

### Install additional plugins as needed:
```bash
npm install @simplewebauthn/browser @simplewebauthn/server  # for passkeys
```

## Production Checklist

- [ ] Generate strong `BETTER_AUTH_SECRET` for production
- [ ] Update `BETTER_AUTH_URL` to production domain
- [ ] Update OAuth redirect URIs in Google/GitHub console
- [ ] Configure production database
- [ ] Set up email service for magic links
- [ ] Update passkey `rpID` to production domain
- [ ] Enable HTTPS for production
- [ ] Configure CORS if client/server are on different domains
- [ ] Set up proper error handling and logging
- [ ] Test all authentication flows

## Troubleshooting

### Common Issues:
1. **Database errors**: Run migrations with `npx better-auth migrate`
2. **OAuth redirect mismatch**: Check redirect URIs match exactly
3. **Session not persisting**: Check cookie settings and CORS
4. **Passkey not working**: Ensure HTTPS in production
5. **Magic link not sending**: Implement email service in config

## Resources
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Basic Usage Guide](https://www.better-auth.com/docs/basic-usage)
- [Plugin Documentation](https://www.better-auth.com/docs/plugins)

# basic-usage: Basic Usage
URL: /docs/basic-usage
Source: https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/basic-usage.mdx

Getting started with Better Auth
        
***

title: Basic Usage
description: Getting started with Better Auth
---------------------------------------------

Better Auth provides built-in authentication support for:

* **Email and password**
* **Social provider (Google, GitHub, Apple, and more)**

But also can easily be extended using plugins, such as: [username](/docs/plugins/username), [magic link](/docs/plugins/magic-link), [passkey](/docs/plugins/passkey), [email-otp](/docs/plugins/email-otp), and more.

## Email & Password

To enable email and password authentication:

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    emailAndPassword: {    // [!code highlight]
        enabled: true // [!code highlight]
    } // [!code highlight]
})
```

### Sign Up

To sign up a user you need to call the client method `signUp.email` with the user's information.

```ts title="sign-up.ts"
import { authClient } from "@/lib/auth-client"; //import the auth client // [!code highlight]

const { data, error } = await authClient.signUp.email({
        email, // user email address
        password, // user password -> min 8 characters by default
        name, // user display name
        image, // User image URL (optional)
        callbackURL: "/dashboard" // A URL to redirect to after the user verifies their email (optional)
    }, {
        onRequest: (ctx) => {
            //show loading
        },
        onSuccess: (ctx) => {
            //redirect to the dashboard or sign in page
        },
        onError: (ctx) => {
            // display the error message
            alert(ctx.error.message);
        },
});
```

By default, the users are automatically signed in after they successfully sign up. To disable this behavior you can set `autoSignIn` to `false`.

```ts title="auth.ts"
import { betterAuth } from "better-auth"

export const auth = betterAuth({
    emailAndPassword: {
    	enabled: true,
    	autoSignIn: false //defaults to true // [!code highlight]
  },
})
```

### Sign In

To sign a user in, you can use the `signIn.email` function provided by the client.

```ts title="sign-in"
const { data, error } = await authClient.signIn.email({
        /**
         * The user email
         */
        email,
        /**
         * The user password
         */
        password,
        /**
         * A URL to redirect to after the user verifies their email (optional)
         */
        callbackURL: "/dashboard",
        /**
         * remember the user session after the browser is closed. 
         * @default true
         */
        rememberMe: false
}, {
    //callbacks
})
```

<Callout type="warn">
  Always invoke client methods from the client side. Don't call them from the server.
</Callout>

### Server-Side Authentication

To authenticate a user on the server, you can use the `auth.api` methods.

```ts title="server.ts"
import { auth } from "./auth"; // path to your Better Auth server instance

const response = await auth.api.signInEmail({
    body: {
        email,
        password
    },
    asResponse: true // returns a response object instead of data
});
```

<Callout>
  If the server cannot return a response object, you'll need to manually parse and set cookies. But for frameworks like Next.js we provide [a plugin](/docs/integrations/next#server-action-cookies) to handle this automatically
</Callout>

## Social Sign-On

Better Auth supports multiple social providers, including Google, GitHub, Apple, Discord, and more. To use a social provider, you need to configure the ones you need in the `socialProviders` option on your `auth` object.

```ts title="auth.ts"
import { betterAuth } from "better-auth";

export const auth = betterAuth({
    socialProviders: { // [!code highlight]
        github: { // [!code highlight]
            clientId: process.env.GITHUB_CLIENT_ID!, // [!code highlight]
            clientSecret: process.env.GITHUB_CLIENT_SECRET!, // [!code highlight]
        } // [!code highlight]
    }, // [!code highlight]
})
```

### Sign in with social providers

To sign in using a social provider you need to call `signIn.social`. It takes an object with the following properties:

```ts title="sign-in.ts"
import { authClient } from "@/lib/auth-client"; //import the auth client // [!code highlight]

await authClient.signIn.social({
    /**
     * The social provider ID
     * @example "github", "google", "apple"
     */
    provider: "github",
    /**
     * A URL to redirect after the user authenticates with the provider
     * @default "/"
     */
    callbackURL: "/dashboard", 
    /**
     * A URL to redirect if an error occurs during the sign in process
     */
    errorCallbackURL: "/error",
    /**
     * A URL to redirect if the user is newly registered
     */
    newUserCallbackURL: "/welcome",
    /**
     * disable the automatic redirect to the provider. 
     * @default false
     */
    disableRedirect: true,
});
```

You can also authenticate using `idToken` or `accessToken` from the social provider instead of redirecting the user to the provider's site. See social providers documentation for more details.

## Signout

To signout a user, you can use the `signOut` function provided by the client.

```ts title="user-card.tsx"
await authClient.signOut();
```

you can pass `fetchOptions` to redirect onSuccess

```ts title="user-card.tsx" 
await authClient.signOut({
  fetchOptions: {
    onSuccess: () => {
      router.push("/login"); // redirect to login page
    },
  },
});
```

## Session

Once a user is signed in, you'll want to access the user session. Better Auth allows you to easily access the session data from both the server and client sides.

### Client Side

#### Use Session

Better Auth provides a `useSession` hook to easily access session data on the client side. This hook is implemented using nanostore and has support for each supported framework and vanilla client, ensuring that any changes to the session (such as signing out) are immediately reflected in your UI.

<Tabs items={["React", "Vue","Svelte", "Solid", "Vanilla"]} defaultValue="react">
  <Tab value="React">
    ```tsx title="user.tsx"
    import { authClient } from "@/lib/auth-client" // import the auth client // [!code highlight] 

    export function User(){

        const { // [!code highlight]
            data: session, // [!code highlight]
            isPending, //loading state // [!code highlight]
            error, //error object // [!code highlight]
            refetch //refetch the session
        } = authClient.useSession() // [!code highlight]

        return (
            //...
        )
    }
    ```
  </Tab>

  <Tab value="Vue">
    ```vue title="index.vue"
    <script setup lang="ts">
    import { authClient } from "~/lib/auth-client" // [!code highlight]

    const session = authClient.useSession() // [!code highlight]
    </script>

    <template>
        <div>
            <div>
                <pre>{{ session.data }}</pre>
                <button v-if="session.data" @click="authClient.signOut()">
                    Sign out
                </button>
            </div>
        </div>
    </template>
    ```
  </Tab>

  <Tab value="Svelte">
    ```svelte title="user.svelte"
    <script lang="ts">
    import { authClient } from "$lib/auth-client"; // [!code highlight]

    const session = authClient.useSession(); // [!code highlight]
    </script>
    <p>
        {$session.data?.user.email}
    </p>
    ```
  </Tab>

  <Tab value="Vanilla">
    ```ts title="user.svelte"
    import { authClient } from "~/lib/auth-client"; //import the auth client

    authClient.useSession.subscribe((value)=>{
        //do something with the session //
    }) 
    ```
  </Tab>

  <Tab value="Solid">
    ```tsx title="user.tsx"
    import { authClient } from "~/lib/auth-client"; // [!code highlight]

    export default function Home() {
        const session = authClient.useSession() // [!code highlight]
        return (
            <pre>{JSON.stringify(session(), null, 2)}</pre>
        );
    }
    ```
  </Tab>
</Tabs>

#### Get Session

If you prefer not to use the hook, you can use the `getSession` method provided by the client.

```ts title="user.tsx"
import { authClient } from "@/lib/auth-client" // import the auth client // [!code highlight]

const { data: session, error } = await authClient.getSession()
```

You can also use it with client-side data-fetching libraries like [TanStack Query](https://tanstack.com/query/latest).

### Server Side

The server provides a `session` object that you can use to access the session data. It requires request headers object to be passed to the `getSession` method.

**Example: Using some popular frameworks**

<Tabs items={["Next.js", "Nuxt", "Svelte", "Astro", "Hono", "TanStack"]}>
  <Tab value="Next.js">
    ```ts title="server.ts"
    import { auth } from "./auth"; // path to your Better Auth server instance
    import { headers } from "next/headers";

    const session = await auth.api.getSession({
        headers: await headers() // you need to pass the headers object.
    })
    ```
  </Tab>

  <Tab value="Remix">
    ```ts title="route.ts"
    import { auth } from "lib/auth"; // path to your Better Auth server instance

    export async function loader({ request }: LoaderFunctionArgs) {
        const session = await auth.api.getSession({
            headers: request.headers
        })

        return json({ session })
    }
    ```
  </Tab>

  <Tab value="Astro">
    ```astro title="index.astro"
    ---
    import { auth } from "./auth";

    const session = await auth.api.getSession({
        headers: Astro.request.headers,
    });
    ---
    <!-- Your Astro Template -->
    ```
  </Tab>

  <Tab value="Svelte">
    ```ts title="+page.ts"
    import { auth } from "./auth";

    export async function load({ request }) {
        const session = await auth.api.getSession({
            headers: request.headers
        })
        return {
            props: {
                session
            }
        }
    }
    ```
  </Tab>

  <Tab value="Hono">
    ```ts title="index.ts"
    import { auth } from "./auth";

    const app = new Hono();

    app.get("/path", async (c) => {
        const session = await auth.api.getSession({
            headers: c.req.raw.headers
        })
    });
    ```
  </Tab>

  <Tab value="Nuxt">
    ```ts title="server/session.ts"
    import { auth } from "~/utils/auth";

    export default defineEventHandler((event) => {
        const session = await auth.api.getSession({
            headers: event.headers,
        })
    });
    ```
  </Tab>

  <Tab value="TanStack">
    ```ts title="app/routes/api/index.ts"
    import { auth } from "./auth";
    import { createAPIFileRoute } from "@tanstack/start/api";

    export const APIRoute = createAPIFileRoute("/api/$")({
        GET: async ({ request }) => {
            const session = await auth.api.getSession({
                headers: request.headers
            })
        },
    });
    ```
  </Tab>
</Tabs>

<Callout>
  For more details check [session-management](/docs/concepts/session-management) documentation.
</Callout>

## Using Plugins

One of the unique features of Better Auth is a plugins ecosystem. It allows you to add complex auth related functionality with small lines of code.

Below is an example of how to add two factor authentication using two factor plugin.

<Steps>
  <Step>
    ### Server Configuration

    To add a plugin, you need to import the plugin and pass it to the `plugins` option of the auth instance. For example, to add two factor authentication, you can use the following code:

    ```ts title="auth.ts"
    import { betterAuth } from "better-auth"
    import { twoFactor } from "better-auth/plugins" // [!code highlight]

    export const auth = betterAuth({
        //...rest of the options
        plugins: [ // [!code highlight]
            twoFactor() // [!code highlight]
        ] // [!code highlight]
    })
    ```

    now two factor related routes and method will be available on the server.
  </Step>

  <Step>
    ### Migrate Database

    After adding the plugin, you'll need to add the required tables to your database. You can do this by running the `migrate` command, or by using the `generate` command to create the schema and handle the migration manually.

    generating the schema:

    ```bash title="terminal"
    npx @better-auth/cli generate
    ```

    using the `migrate` command:

    ```bash title="terminal"
    npx @better-auth/cli migrate
    ```

    <Callout>
      If you prefer adding the schema manually, you can check the schema required on the [two factor plugin](/docs/plugins/2fa#schema) documentation.
    </Callout>
  </Step>

  <Step>
    ### Client Configuration

    Once we're done with the server, we need to add the plugin to the client. To do this, you need to import the plugin and pass it to the `plugins` option of the auth client. For example, to add two factor authentication, you can use the following code:

    ```ts title="auth-client.ts"  
    import { createAuthClient } from "better-auth/client";
    import { twoFactorClient } from "better-auth/client/plugins"; // [!code highlight]

    const authClient = createAuthClient({
        plugins: [ // [!code highlight]
            twoFactorClient({ // [!code highlight]
                twoFactorPage: "/two-factor" // the page to redirect if a user needs to verify 2nd factor // [!code highlight]
            }) // [!code highlight]
        ] // [!code highlight]
    })
    ```

    now two factor related methods will be available on the client.

    ```ts title="profile.ts"
    import { authClient } from "./auth-client"

    const enableTwoFactor = async() => {
        const data = await authClient.twoFactor.enable({
            password // the user password is required
        }) // this will enable two factor
    }

    const disableTwoFactor = async() => {
        const data = await authClient.twoFactor.disable({
            password // the user password is required
        }) // this will disable two factor
    }

    const signInWith2Factor = async() => {
        const data = await authClient.signIn.email({
            //...
        })
        //if the user has two factor enabled, it will redirect to the two factor page
    }

    const verifyTOTP = async() => {
        const data = await authClient.twoFactor.verifyTOTP({
            code: "123456", // the code entered by the user 
            /**
             * If the device is trusted, the user won't
             * need to pass 2FA again on the same device
             */
            trustDevice: true
        })
    }
    ```
  </Step>

  <Step>
    Next step: See the <Link href="/docs/plugins/2fa">two factor plugin documentation</Link>.
  </Step>
</Steps>

