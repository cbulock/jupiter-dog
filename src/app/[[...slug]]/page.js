import Layout from "@/components/layout";
import Home from "@/components/Home";
import { photoPage } from "@/photo-catalog";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Life of Jupiter",
  description: "Image gallery for the greatest pup in the world, Jupiter",
};

export default async function Page() {
  let initialPage = null;
  try {
    initialPage = await photoPage();
  } catch (error) {
    // Keep the page and client-side retry available during a storage outage.
    console.error("Initial photos unavailable:", error.message);
  }
  return (
    <Layout>
      <Home initialPage={initialPage} />
    </Layout>
  );
}
