import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = { title: "Blog Pipeline" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="shell">
          <Sidebar />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}