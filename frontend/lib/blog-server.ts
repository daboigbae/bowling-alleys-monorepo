// Blog utilities for Next.js Server Components
// Can use fs directly since this runs on the server

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

export interface BlogPost {
  slug: string;
  title: string;
  description?: string;
  author?: string;
  date?: string;
  updated?: string;
  category?: string;
  tags?: string[];
  image?: string;
  content?: string;
}

// In Next.js, when running from frontend/, process.cwd() is the frontend directory
// The blog content is at frontend/content/blog
const blogDirectory = path.join(process.cwd(), 'content', 'blog');

export function getAllBlogPosts(): BlogPost[] {
  try {
    if (!fs.existsSync(blogDirectory)) {
      console.error(`Blog directory does not exist: ${blogDirectory}`);
      console.error(`Current working directory: ${process.cwd()}`);
      return [];
    }

    const fileNames = fs.readdirSync(blogDirectory);
    console.log(`Found ${fileNames.length} files in blog directory: ${blogDirectory}`);
    const allPostsData = fileNames
      .filter((name) => name.endsWith('.mdx'))
      .map((fileName) => {
        const slug = fileName.replace(/\.mdx$/, '');
        const fullPath = path.join(blogDirectory, fileName);
        const fileContents = fs.readFileSync(fullPath, 'utf8');
        const { data, content } = matter(fileContents);

        return {
          slug,
          title: data.title || '',
          description: data.description,
          author: data.author,
          date: data.date,
          updated: data.updated,
          category: data.category,
          tags: data.tags || [],
          image: data.image,
          content,
        } as BlogPost;
      })
      .filter((post) => post.title) // Only include posts with titles
      .sort((a, b) => {
        const dateA = new Date(a.updated ?? a.date ?? 0).getTime();
        const dateB = new Date(b.updated ?? b.date ?? 0).getTime();
        return dateB - dateA; // Sort by date (updated or published), newest first
      });

    return allPostsData;
  } catch (error) {
    console.error('Error reading blog posts:', error);
    return [];
  }
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(blogDirectory, `${slug}.mdx`);
    if (!fs.existsSync(fullPath)) {
      return null;
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || '',
      description: data.description,
      author: data.author,
      date: data.date,
      updated: data.updated,
      category: data.category,
      tags: data.tags || [],
      image: data.image,
      content,
    } as BlogPost;
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error);
    return null;
  }
}

export function getBlogPostSlugs(): string[] {
  try {
    if (!fs.existsSync(blogDirectory)) {
      return [];
    }
    const fileNames = fs.readdirSync(blogDirectory);
    return fileNames
      .filter((name) => name.endsWith('.mdx'))
      .map((fileName) => fileName.replace(/\.mdx$/, ''));
  } catch (error) {
    console.error('Error reading blog post slugs:', error);
    return [];
  }
}

