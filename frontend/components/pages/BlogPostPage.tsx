'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { type BlogPost } from '@/lib/blog-server';
import AuthModal from '@/components/AuthModal';
import RelatedBlogPosts from '@/components/RelatedBlogPosts';
import ReactMarkdown from 'react-markdown';

interface BlogPostPageProps {
  post: BlogPost;
  allPosts: BlogPost[];
}

export default function BlogPostPage({ post, allPosts }: BlogPostPageProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [origin, setOrigin] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // Find previous and next posts
  const currentIndex = allPosts?.findIndex(p => p.slug === post.slug) ?? -1;
  const previousPost = currentIndex > 0 ? allPosts?.[currentIndex - 1] : null;
  const nextPost = currentIndex >= 0 && currentIndex < (allPosts?.length ?? 0) - 1 ? allPosts?.[currentIndex + 1] : null;

  // Set origin and URL for SSR safety
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setCurrentUrl(window.location.href);
    }
  }, []);

  // Update SEO meta tags when post loads
  useEffect(() => {
    if (post) {
      // Set page title
      document.title = `${post.title} | BowlingAlleys.io Blog`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', post.description ?? "");
      } else {
        const meta = document.createElement('meta');
        meta.name = 'description';
        meta.content = post.description ?? "";
        document.head.appendChild(meta);
      }
      
      // Add Open Graph tags
      const ogImageUrl = post.image 
        ? `${origin}${post.image}`
        : `${origin}/og-image.png`;
      const ogTags = [
        { property: 'og:title', content: post.title },
        { property: 'og:description', content: post.description ?? "" },
        { property: 'og:url', content: currentUrl },
        { property: 'og:type', content: 'article' },
        { property: 'og:site_name', content: 'BowlingAlleys.io' },
        { property: 'og:image', content: ogImageUrl },
        { property: 'article:published_time', content: post.updated ?? "" },
        { property: 'article:author', content: 'BowlingAlleys.io' },
        { property: 'article:section', content: 'Bowling Tips & Guides' }
      ];
      
      ogTags.forEach(tag => {
        const content = tag.content ?? "";
        let existing = document.querySelector(`meta[property="${tag.property}"]`);
        if (existing) {
          existing.setAttribute('content', content);
        } else {
          const meta = document.createElement('meta');
          meta.setAttribute('property', tag.property);
          meta.setAttribute('content', content);
          document.head.appendChild(meta);
        }
      });
      
      // Add structured data (JSON-LD)
      const structuredData = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": post.title,
        "description": post.description ?? "",
        "url": currentUrl,
        "datePublished": post.updated,
        "dateModified": post.updated,
        "author": {
          "@type": "Organization",
          "name": "BowlingAlleys.io"
        },
        "publisher": {
          "@type": "Organization",
          "name": "BowlingAlleys.io",
          "url": "https://bowlingalleys.io"
        },
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": currentUrl
        },
        "keywords": (post.tags ?? []).join(', ')
      };
      
      // Remove existing structured data
      const existingScript = document.querySelector('script[type="application/ld+json"]');
      if (existingScript) {
        existingScript.remove();
      }
      
      // Add new structured data
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
      
      // Add canonical URL
      let canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.setAttribute('href', currentUrl);
      } else {
        const link = document.createElement('link');
        link.rel = 'canonical';
        link.href = currentUrl;
        document.head.appendChild(link);
      }
    }
  }, [post, origin, currentUrl]);

  return (
    <div>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Button variant="ghost" asChild className="mb-6" data-testid="button-back-to-blogs">
            <Link href="/blog">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Link>
          </Button>

          <article>
          {post.image && (
            <div className="mb-8 rounded-lg overflow-hidden">
              <img 
                src={post.image} 
                alt={post.title}
                className="w-full h-64 md:h-80 object-cover"
                data-testid="img-blog-cover"
              />
            </div>
          )}
          <header className="mb-8">
            <h1 className="text-4xl font-bold mb-4" data-testid="text-blog-post-title">{post.title}</h1>
            {post.description && (
              <p className="text-xl text-muted-foreground mb-4">{post.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {(post.date || post.updated) && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <time dateTime={post.updated || post.date}>
                    {new Date(post.updated || post.date || '').toLocaleDateString()}
                  </time>
                </div>
              )}
              {post.tags && post.tags.length > 0 && (
                <div className="flex gap-1">
                  {post.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs" data-testid={`badge-tag-${tag}`}>
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </header>

          {/* Bowling Alleys to Explore */}
          <RelatedBlogPosts />

          <Card>
            <CardContent className="p-6">
              <div className="prose prose-lg max-w-none" data-testid="content-blog-post">
                {post.content ? (
                  <ReactMarkdown>{post.content}</ReactMarkdown>
                ) : (
                  <div className="text-muted-foreground">Failed to load blog content.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Previous/Next Post Navigation */}
          {(previousPost || nextPost) && (
            <nav className="mt-12 pt-8 border-t" data-testid="nav-post-navigation">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">Continue Reading</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {previousPost && (
                  <Link href={`/blog/${previousPost.slug}`}>
                    <Card className="hover-elevate active-elevate-2 cursor-pointer h-full transition-all" data-testid="card-previous-post">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <ChevronLeft className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-muted-foreground mb-1">Previous Post</p>
                            <h4 className="font-semibold line-clamp-2" data-testid="text-previous-post-title">{previousPost.title}</h4>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{previousPost.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
                {nextPost && (
                  <Link href={`/blog/${nextPost.slug}`}>
                    <Card className="hover-elevate active-elevate-2 cursor-pointer h-full transition-all" data-testid="card-next-post">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-muted-foreground mb-1">Next Post</p>
                            <h4 className="font-semibold line-clamp-2" data-testid="text-next-post-title">{nextPost.title}</h4>
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{nextPost.description}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )}
              </div>
            </nav>
          )}

          </article>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
    </div>
  );
}