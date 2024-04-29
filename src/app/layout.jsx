import Script from "next/script";

export const metadata = {
  title: "Life of Jupiter",
  description: "Image gallery for the greatest pup in the world, Jupiter",
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <div id="root">{children}</div>
        <Script
          src="https://identity.netlify.com/v1/netlify-identity-widget.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
