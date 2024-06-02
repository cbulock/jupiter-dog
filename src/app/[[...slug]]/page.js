import Layout from "@/components/layout";
import Home from "@/components/Home";

export const metadata = {
  title: "Life of Jupiter",
  description: "Image gallery for the greatest pup in the world, Jupiter",
  manifest: "/site.webmanifest",
};

export function generateStaticParams() {
  return [{ slug: [""] }];
}

export default function Page() {
  return (
    <Layout>
      <Home />
    </Layout>
  );
}
