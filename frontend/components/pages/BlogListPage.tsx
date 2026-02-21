'use client';

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar, Search, Filter, Users, Mail, MapPin } from "lucide-react";
import { type BlogPost } from "@/lib/blog-server";
import AuthModal from "@/components/AuthModal";

const POSTS_PER_PAGE = 6;

interface BlogListPageProps {
  initialPosts: BlogPost[];
}

export default function BlogListPage({ initialPosts }: BlogListPageProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const openAuthModal = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // Set page title, meta description, and meta keywords
  useEffect(() => {
    document.title =
      "BowlingAlleys.io Blog: Bowling Alley Recommendations & Tips";

    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        "content",
        "BowlingAlleys.io: Find the best bowling alleys! Read reviews, get local picks, and enjoy tips for league nights. Start bowling now!",
      );
    }

    // Update meta keywords
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.setAttribute(
        "content",
        "bowling alleys, best bowling alleys, bowling tips, bowling leagues, family bowling, local bowling options, El Paso bowling, bowling recommendations",
      );
    }
  }, []);

  const posts = initialPosts;
  const isLoading = false;
  const error = null;

  // Category mapping based on tags and content
  const getPostCategory = (post: BlogPost) => {
    const tags = post.tags ?? [];
    if (tags.includes("beginners")) return "beginners";
    if (tags.includes("advanced")) return "advanced";
    if (tags.includes("social")) return "social";
    if (tags.includes("food")) return "food";
    if (tags.includes("bowling business")) return "business";
    if (tags.includes("skills")) return "skills";
    if (tags.includes("community")) return "community";
    if (tags.includes("travel")) return "travel";

    return "tips";
  };

  const categories = [
    { id: "all", label: "All Posts", count: posts?.length || 0 },
    { id: "beginners", label: "Beginner Guides", count: 0 },
    { id: "advanced", label: "Advanced Tips", count: 0 },
    { id: "social", label: "Night Out Ideas", count: 0 },
    { id: "food", label: "Food & Drinks", count: 0 },
    { id: "business", label: "Bowling Business", count: 0 },
    { id: "travel", label: "Alley Guides", count: 0 },
    { id: "community", label: "Community (Bowling.io Updates)", count: 0 },
    { id: "tips", label: "Tips & Tricks", count: 0 },
  ];

  // Update category counts
  if (posts) {
    posts.forEach((post) => {
      const category = getPostCategory(post);
      const categoryObj = categories.find((c) => c.id === category);
      if (categoryObj) categoryObj.count++;
    });
  }

  // Filter and search posts
  const filteredPosts = useMemo(() => {
    if (!posts) return [];

    let filtered = posts.filter((post) => {
      const matchesSearch =
        searchTerm === "" ||
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.description ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.tags ?? []).some((tag) =>
          tag.toLowerCase().includes(searchTerm.toLowerCase()),
        );

      const matchesCategory =
        selectedCategory === "all" ||
        getPostCategory(post) === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    // Exclude featured posts from main list when showing all posts without search/filter
    if (selectedCategory === "all" && searchTerm === "") {
      const pinnedSlugs = [
        "how-to-score-bowling",
        "bowling-drinking-games",
        "bowling-night-out-group-size-guide",
        "how-to-aim-in-bowling"
      ];
      filtered = filtered.filter((post) => !pinnedSlugs.includes(post.slug));
    }

    return filtered;
  }, [posts, searchTerm, selectedCategory]);

  // Pagination logic
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const paginatedPosts = filteredPosts.slice(
    startIndex,
    startIndex + POSTS_PER_PAGE,
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Featured posts (pinned posts in specific order)
  const featuredSlugs = [
    "how-to-score-bowling",
    "bowling-drinking-games",
    "bowling-night-out-group-size-guide",
    "how-to-aim-in-bowling"
  ];
  const featuredPosts = featuredSlugs
    .map(slug => posts?.find(p => p.slug === slug))
    .filter(Boolean) as BlogPost[];

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Blog</h1>
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                  <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Blog</h1>
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                Failed to load blog posts.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8" data-testid="text-blog-title">
          Blog
        </h1>

        {/* Search and Filter Section */}
        <div className="mb-8">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search blog posts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-blog-search"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={
                  selectedCategory === category.id ? "default" : "outline"
                }
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="text-xs"
                data-testid={`button-category-${category.id}`}
              >
                <Filter className="w-3 h-3 mr-1" />
                {category.label} ({category.count})
              </Button>
            ))}
          </div>
        </div>

        {!posts || posts.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">No blog posts yet.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Featured Posts Section */}
            {selectedCategory === "all" && searchTerm === "" && (
              <div className="mb-12">
                <h2 className="text-2xl font-semibold mb-6">Featured Posts</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {featuredPosts.map((post: BlogPost) => (
                    <Card
                      key={post.slug}
                      className="relative hover-elevate transition-colors h-full group"
                      data-testid={`card-featured-post-${post.slug}`}
                    >
                      <Link
                        href={`/blog/${post.slug}`}
                        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-labelledby={`title-featured-${post.slug}`}
                        data-testid={`link-featured-post-${post.slug}`}
                      />
                      <CardHeader>
                        <CardTitle
                          id={`title-featured-${post.slug}`}
                          className="text-lg group-hover:text-primary transition-colors"
                        >
                          {post.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {post.description}
                        </CardDescription>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <time dateTime={post.updated ?? ""}>
                            {post.updated ? new Date(post.updated).toLocaleDateString() : "—"}
                          </time>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(post.tags ?? []).slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                              data-testid={`badge-featured-tag-${tag}`}
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-muted-foreground text-sm line-clamp-2">
                          {(post.content ?? "").slice(0, 100)}...
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All Posts Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">
                  {selectedCategory === "all" && searchTerm === ""
                    ? "All Posts"
                    : searchTerm
                      ? `Search Results (${filteredPosts.length})`
                      : `${categories.find((c) => c.id === selectedCategory)?.label} (${filteredPosts.length})`}
                </h2>
              </div>

              {filteredPosts.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? "No posts match your search."
                        : "No posts in this category."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {paginatedPosts.map((post: BlogPost) => (
                    <Card
                      key={post.slug}
                      className="relative hover-elevate transition-colors h-full group"
                      data-testid={`card-blog-post-${post.slug}`}
                    >
                      <Link
                        href={`/blog/${post.slug}`}
                        className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-labelledby={`title-all-${post.slug}`}
                        data-testid={`link-blog-post-${post.slug}`}
                      />
                      <CardHeader>
                        <CardTitle
                          id={`title-all-${post.slug}`}
                          className="group-hover:text-primary transition-colors"
                        >
                          {post.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {post.description}
                        </CardDescription>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <time dateTime={post.updated ?? ""}>
                              {post.updated ? new Date(post.updated).toLocaleDateString() : "—"}
                            </time>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {(post.tags ?? []).slice(0, 2).map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-xs"
                              data-testid={`badge-tag-${tag}`}
                            >
                              {tag}
                            </Badge>
                          ))}
                          {(post.tags ?? []).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(post.tags ?? []).length - 2} more
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground line-clamp-3">
                          {(post.content ?? "").slice(0, 150)}...
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Pagination - outside the complex conditional for cleaner structure */}
            {filteredPosts.length > 0 && totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => {
                            setCurrentPage(currentPage - 1);
                            window.scrollTo(0, 0);
                          }}
                          className="cursor-pointer"
                          data-testid="button-pagination-previous"
                        />
                      </PaginationItem>
                    )}

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => {
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          Math.abs(page - currentPage) <= 1;

                        if (!showPage) {
                          if (
                            (page === 2 && currentPage > 4) ||
                            (page === totalPages - 1 &&
                              currentPage < totalPages - 3)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            );
                          }
                          return null;
                        }

                        return (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => {
                                setCurrentPage(page);
                                window.scrollTo(0, 0);
                              }}
                              isActive={currentPage === page}
                              className="cursor-pointer"
                              data-testid={`button-pagination-${page}`}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      },
                    )}

                    {currentPage < totalPages && (
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => {
                            setCurrentPage(currentPage + 1);
                            window.scrollTo(0, 0);
                          }}
                          className="cursor-pointer"
                          data-testid="button-pagination-next"
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </div>
  </>
  );
}
