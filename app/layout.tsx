import type {Metadata} from 'next';
import './globals.css';
import { Inter, Space_Grotesk } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });

export const metadata: Metadata = {
  title: 'Converto Admin ERP',
  description: 'Operations Dashboard for Converto',
  openGraph: {
    title: "Converto Admin ERP",
    description: "Operations Dashboard for Converto",
    url: "https://converto.saptech.online/admin",
    siteName: "Converto",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1024,
        height: 1024,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Converto Admin ERP",
    description: "Operations Dashboard for Converto",
    images: ["/opengraph-image.png"],
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn("font-sans", inter.variable, spaceGrotesk.variable)} suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground transition-colors" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
