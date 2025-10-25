// src/routes/__root.tsx
/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
  ScriptOnce,
} from "@tanstack/react-router";
import appCss from "@/styles/app.css?url";
import { ThemeProvider } from "~/components/theme-provider";
import { NotFound } from "~/components/not-found";
import { Toaster } from "~/components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Berza Kafe - DJ & Party Management",
      },
      {
        name: "description",
        content: "Sistem za upravljanje cenama i proizvodima za DJ i žurke",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/x-icon",
        href: "/favicon.ico",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/site.webmanifest",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>
          {`
            (function() {
              try {
                const stored = localStorage.getItem('dj-theme') || 'system';
                const theme = stored === 'system'
                  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                  : stored;
                document.documentElement.classList.add(theme);
              } catch (e) {
                document.documentElement.classList.add('light');
              }
            })();
          `}
        </ScriptOnce>
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}
