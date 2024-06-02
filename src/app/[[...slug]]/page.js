import Layout from "@/components/layout";
import Home from "@/components/Home";

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
