export const metadata = {
  title: "Life of Jupiter",
  description: "Image gallery for the greatest pup in the world, Jupiter",
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
