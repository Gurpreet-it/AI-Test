import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ContentForge",
  description: "AI-powered content generation pipeline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui" }}>
        {children}
      </body>
    </html>
  );
}
