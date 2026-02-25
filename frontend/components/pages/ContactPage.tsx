import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Mail, MessageSquare, HelpCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";

const contactFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  subject: z
    .string()
    .min(3, "Subject must be at least 3 characters")
    .max(100, "Subject must be less than 100 characters"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be less than 1000 characters"),
});

export default function Contact() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof contactFormSchema>) => {
    setIsSubmitting(true);
    try {
      const data = await api.post("/api/contact", {
        email: values.email,
        subject: values.subject,
        message: values.message,
        type: "contact",
      });

      toast({
        title: "Message sent successfully!",
        description: `Your message has been received. Reference ID: ${data.contactId.slice(0, 8)}`,
      });

      form.reset();
    } catch (error) {
      console.error("Contact form submission error:", error);
      toast({
        title: "Failed to send message",
        description:
          error instanceof Error
            ? error.message
            : "Please try again later or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // SEO - Title
    const title = "Contact Us – BowlingAlleys.io";
    document.title = title;

    // SEO - Meta Description
    const description =
      "Get in touch with BowlingAlleys.io. Contact us for questions, feedback, venue submissions, or support. We're here to help you find the perfect bowling experience.";

    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", description);

    // Canonical URL
    const canonicalUrl = window.location.origin + "/contact";
    let linkCanonical = document.querySelector(
      'link[rel="canonical"]',
    ) as HTMLLinkElement | null;
    if (!linkCanonical) {
      linkCanonical = document.createElement("link");
      linkCanonical.rel = "canonical";
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.href = canonicalUrl;

    // Open Graph
    const setOgTag = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    setOgTag("og:title", title);
    setOgTag("og:description", description);
    setOgTag("og:url", canonicalUrl);
    setOgTag("og:type", "website");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1
              className="text-4xl md:text-5xl font-bold mb-4"
              data-testid="heading-contact"
            >
              Contact Us
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Have questions, feedback, or want to submit a bowling alley? We'd
              love to hear from you!
            </p>
          </div>

          {/* Contact Options */}
          <div className="grid gap-6 md:grid-cols-3 mb-12">
            <Card data-testid="card-general-inquiry">
              <CardHeader>
                <MessageSquare className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>General Inquiries</CardTitle>
                <CardDescription>
                  Questions about BowlingAlleys.io or how to use our platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  For general questions, feature requests, or feedback about our
                  service, please reach out via email.
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-venue-submission">
              <CardHeader>
                <Mail className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Venue Submissions</CardTitle>
                <CardDescription>
                  Submit a bowling alley or update venue information
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Know a bowling alley we're missing? Want to update venue
                  details? Let us know!
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-support">
              <CardHeader>
                <HelpCircle className="w-8 h-8 mb-2 text-primary" />
                <CardTitle>Support</CardTitle>
                <CardDescription>
                  Technical issues or account problems
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Experiencing technical difficulties? Need help with your
                  account? We're here to assist.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="mb-12" data-testid="card-contact-form">
            <CardHeader>
              <CardTitle>Send Us a Message</CardTitle>
              <CardDescription>
                We typically respond within 24-48 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="your.email@example.com"
                            data-testid="input-email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="What is this regarding?"
                            data-testid="input-subject"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us how we can help..."
                            className="min-h-[150px]"
                            data-testid="input-message"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full"
                    data-testid="button-submit"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Sending..." : "Send Message"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* FAQ Section */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    How do I add a bowling alley to the directory?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Contact us via email with the bowling alley's name, address,
                    and any relevant details. Our team will review and add it to
                    our directory.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    How do I update information for a venue?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    If you notice outdated information, please contact us with
                    the venue name and the corrections needed. We'll update it
                    promptly.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Can I delete my review?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes! Log in to your account, navigate to the venue where you
                    left a review, and you'll find options to edit or delete
                    your review.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Do you offer advertising for bowling alleys?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Currently, we don't offer paid advertising options. All
                    venues are listed based on our directory criteria and user
                    reviews.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 p-6 bg-muted/30 rounded-lg text-center">
            <p className="text-muted-foreground mb-4">
              Ready to explore bowling alleys near you?
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild>
                <Link href="/locations" data-testid="link-find-alleys">
                  Find Bowling Alleys
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/" data-testid="link-home">
                  Back to Home
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
