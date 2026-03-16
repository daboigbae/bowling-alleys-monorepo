import { getAllBlogPosts } from "@/lib/blog-server";
import BlogListPage from "@/components/pages/BlogListPage";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bowling Tips, Guides & Local Picks | BowlingAlleys.io Blog",
  description:
    "Bowling tips for beginners and pros: how to aim, score, find the best local alleys, group size guides, pricing breakdowns, and more.",
  openGraph: {
    title: "Bowling Tips, Guides & Local Picks | BowlingAlleys.io Blog",
    description:
      "Bowling tips for beginners and pros: how to aim, score, find the best local alleys, group size guides, pricing breakdowns, and more.",
    url: "https://bowlingalleys.io/blog",
    siteName: "BowlingAlleys.io",
    type: "website",
  },
  alternates: {
    canonical: "https://bowlingalleys.io/blog",
  },
};

export default function Blog() {
  const posts = getAllBlogPosts();
  console.log(`Blog page: Loaded ${posts.length} posts`);
  return <BlogListPage initialPosts={posts} />;
}

