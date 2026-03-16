import { getBlogPostBySlug, getAllBlogPosts, getBlogPostSlugs } from "@/lib/blog-server";
import BlogPostPage from "@/components/pages/BlogPostPage";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// Generate static params for all blog posts at build time
export function generateStaticParams() {
  return getBlogPostSlugs().map((slug) => ({ slug }));
}

// Server-side metadata so Googlebot can crawl titles and descriptions
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = getBlogPostBySlug(params.slug);

  if (!post) {
    return {
      title: "Post Not Found | BowlingAlleys.io Blog",
      description: "The blog post you're looking for could not be found.",
    };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://bowlingalleys.io";
  const currentUrl = `${siteUrl}/blog/${params.slug}`;
  const ogImage = post.image
    ? `${siteUrl}${post.image}`
    : `${siteUrl}/og-image.png`;

  return {
    title: `${post.title} | BowlingAlleys.io`,
    description: post.description ?? "",
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description ?? "",
      url: currentUrl,
      siteName: "BowlingAlleys.io",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author ?? "BowlingAlleys.io"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description ?? "",
      images: [ogImage],
    },
    alternates: {
      canonical: currentUrl,
    },
  };
}

export default function BlogPost({ params }: { params: { slug: string } }) {
  const post = getBlogPostBySlug(params.slug);
  const allPosts = getAllBlogPosts();

  if (!post) {
    notFound();
  }

  return <BlogPostPage post={post} allPosts={allPosts} />;
}

