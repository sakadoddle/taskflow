import "./globals.css";
import { ThemeProvider } from "./providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en"  className="h-full light" suppressHydrationWarning>
      <body className="bg-white text-black dark:bg-black dark:text-white">
          <ThemeProvider
            attribute="class"
          >
            {children}
          </ThemeProvider>
      </body>
    </html>
  );
}
