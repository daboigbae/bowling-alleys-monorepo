'use client';

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  User,
  Settings,
  Menu,
  X,
  ChevronDown,
  Bookmark,
  Building2,
  HelpCircle,
  LogOut,
} from "lucide-react";
import AuthModal from "./AuthModal";
import { OnboardingModal } from "./OnboardingModal";
import { useAuth } from "@/lib/auth";
import Image from "next/image";

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Check for webview mode (hides mobile menu for embedded app views)
  const isWebview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('webview') === 'true';

  const openAuthModal = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  return (
    <>
      {/* Dark gray top bar */}
      <div className="w-full bg-gray-800 h-1"></div>
      
      {/* Main navigation bar */}
      <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              {/* Logo */}
              {isWebview ? (
                <div className="flex items-center py-2 pr-8">
                  <Image
                    src="/attached_assets/Main_Logo_1767046875251.webp"
                    alt="BAiO Bowling Alleys"
                    width={200}
                    height={80}
                    className="h-10 w-auto"
                  />
                </div>
              ) : (
                <Link href="/" className="flex items-center py-2 pr-8">
                  <Image
                    src="/attached_assets/Main_Logo_1767046875251.webp"
                    alt="BAiO Bowling Alleys"
                    width={200}
                    height={80}
                    className="h-10 w-auto"
                  />
                </Link>
              )}

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-6">
                <Link
                  href="/"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    isActive('/') 
                      ? 'text-[#0d3149] border-b-2 border-[#d52231] font-semibold' 
                      : 'text-gray-700 hover:text-[#0d3149]'
                  }`}
                  data-testid="link-home"
                >
                  Home
                </Link>
                <Link
                  href="/locations"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    isActive('/locations') 
                      ? 'text-[#0d3149] border-b-2 border-[#d52231] font-semibold' 
                      : 'text-gray-700 hover:text-[#0d3149]'
                  }`}
                  data-testid="link-locations"
                >
                  Explore
                </Link>
                <Link
                  href="/city-guides"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    isActive('/city-guides') 
                      ? 'text-[#0d3149] border-b-2 border-[#d52231] font-semibold' 
                      : 'text-gray-700 hover:text-[#0d3149]'
                  }`}
                  data-testid="link-city-guides"
                >
                  City Guides
                </Link>
                <Link
                  href="/bowling-leagues"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    isActive('/bowling-leagues') 
                      ? 'text-[#0d3149] border-b-2 border-[#d52231] font-semibold' 
                      : 'text-gray-700 hover:text-[#0d3149]'
                  }`}
                  data-testid="link-bowling-leagues"
                >
                  Leagues
                </Link>
                <Link
                  href="/bowling-cost"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    isActive('/bowling-cost') 
                      ? 'text-[#0d3149] border-b-2 border-[#d52231] font-semibold' 
                      : 'text-gray-700 hover:text-[#0d3149]'
                  }`}
                  data-testid="link-bowling-cost"
                >
                  Pricing
                </Link>
                <Link
                  href="/specials"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    isActive('/specials') 
                      ? 'text-[#0d3149] border-b-2 border-[#d52231] font-semibold' 
                      : 'text-gray-700 hover:text-[#0d3149]'
                  }`}
                  data-testid="link-specials"
                >
                  Specials
                </Link>
                <Link
                  href="/experiences"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    isActive('/experiences') 
                      ? 'text-[#0d3149] border-b-2 border-[#d52231] font-semibold' 
                      : 'text-gray-700 hover:text-[#0d3149]'
                  }`}
                  data-testid="link-experiences"
                >
                  Experiences
                </Link>
                <Link
                  href="/blog"
                  className={`text-sm font-medium transition-all relative pb-1 ${
                    isActive('/blog') 
                      ? 'text-[#0d3149] border-b-2 border-[#d52231] font-semibold' 
                      : 'text-gray-700 hover:text-[#0d3149]'
                  }`}
                  data-testid="link-blog"
                >
                  Tips
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              {/* Mobile Menu */}
              {!isWebview && (
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden"
                      data-testid="button-mobile-menu"
                    >
                      <Menu className="h-6 w-6" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent
                    side="right"
                    className="w-80 bg-white border-l shadow-xl overflow-y-auto"
                  >
                    <SheetHeader>
                      <SheetTitle className="text-left">Menu</SheetTitle>
                    </SheetHeader>
                    <div className="py-6 pb-20">
                      <nav className="flex flex-col space-y-4">
                        <Link
                          href="/"
                          className={`text-base font-medium transition-all py-2 px-3 rounded-md ${
                            isActive('/')
                              ? 'text-[#0d3149] bg-red-50 border-l-4 border-[#d52231] font-semibold'
                              : 'text-gray-700 hover:text-[#0d3149] hover:bg-gray-50'
                          }`}
                          data-testid="link-mobile-home"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Home
                        </Link>
                        <Link
                          href="/locations"
                          className={`text-base font-medium transition-all py-2 px-3 rounded-md ${
                            isActive('/locations')
                              ? 'text-[#0d3149] bg-red-50 border-l-4 border-[#d52231] font-semibold'
                              : 'text-gray-700 hover:text-[#0d3149] hover:bg-gray-50'
                          }`}
                          data-testid="link-mobile-locations"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Explore
                        </Link>
                        <Link
                          href="/city-guides"
                          className={`text-base font-medium transition-all py-2 px-3 rounded-md ${
                            isActive('/city-guides')
                              ? 'text-[#0d3149] bg-red-50 border-l-4 border-[#d52231] font-semibold'
                              : 'text-gray-700 hover:text-[#0d3149] hover:bg-gray-50'
                          }`}
                          data-testid="link-mobile-city-guides"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          City Guides
                        </Link>
                        <Link
                          href="/bowling-leagues"
                          className={`text-base font-medium transition-all py-2 px-3 rounded-md ${
                            isActive('/bowling-leagues')
                              ? 'text-[#0d3149] bg-red-50 border-l-4 border-[#d52231] font-semibold'
                              : 'text-gray-700 hover:text-[#0d3149] hover:bg-gray-50'
                          }`}
                          data-testid="link-mobile-bowling-leagues"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Leagues
                        </Link>
                        <Link
                          href="/bowling-cost"
                          className={`text-base font-medium transition-all py-2 px-3 rounded-md ${
                            isActive('/bowling-cost')
                              ? 'text-[#0d3149] bg-red-50 border-l-4 border-[#d52231] font-semibold'
                              : 'text-gray-700 hover:text-[#0d3149] hover:bg-gray-50'
                          }`}
                          data-testid="link-mobile-bowling-cost"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Pricing
                        </Link>
                        <Link
                          href="/specials"
                          className={`text-base font-medium transition-all py-2 px-3 rounded-md ${
                            isActive('/specials')
                              ? 'text-[#0d3149] bg-red-50 border-l-4 border-[#d52231] font-semibold'
                              : 'text-gray-700 hover:text-[#0d3149] hover:bg-gray-50'
                          }`}
                          data-testid="link-mobile-specials"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Specials
                        </Link>
                        <Link
                          href="/experiences"
                          className={`text-base font-medium transition-all py-2 px-3 rounded-md ${
                            isActive('/experiences')
                              ? 'text-[#0d3149] bg-red-50 border-l-4 border-[#d52231] font-semibold'
                              : 'text-gray-700 hover:text-[#0d3149] hover:bg-gray-50'
                          }`}
                          data-testid="link-mobile-experiences"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Experiences
                        </Link>
                        <Link
                          href="/blog"
                          className={`text-base font-medium transition-all py-2 px-3 rounded-md border-t pt-4 ${
                            isActive('/blog')
                              ? 'text-[#0d3149] bg-red-50 border-l-4 border-[#d52231] font-semibold'
                              : 'text-gray-700 hover:text-[#0d3149] hover:bg-gray-50'
                          }`}
                          data-testid="link-mobile-blog"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          Tips
                        </Link>
                      </nav>

                      {/* Mobile Auth Section */}
                      <div className="pt-6 mt-6 border-t">
                        {user ? (
                          <div className="space-y-4">
                            <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={user.photoURL || undefined} />
                                <AvatarFallback>
                                  {user.displayName?.charAt(0).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <span className="font-medium text-sm">
                                  {user.displayName || "User"}
                                </span>
                                <span className="text-xs text-muted-foreground block">
                                  {user.email}
                                </span>
                              </div>
                            </div>

                            <Link href="/account">
                              <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => setMobileMenuOpen(false)}
                                data-testid="button-mobile-profile"
                              >
                                <User className="mr-2 h-4 w-4" />
                                Account
                              </Button>
                            </Link>

                            <Link href="/saved-alleys">
                              <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => setMobileMenuOpen(false)}
                                data-testid="button-mobile-saved-alleys"
                              >
                                <Bookmark className="mr-2 h-4 w-4" />
                                Saved Alleys
                              </Button>
                            </Link>

                            {user && (user as any).ownedVenueIds && (user as any).ownedVenueIds.length > 0 && (
                              <Link href="/my-venues">
                                <Button
                                  variant="outline"
                                  className="w-full justify-start"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  <Building2 className="mr-2 h-4 w-4" />
                                  My Venues
                                </Button>
                              </Link>
                            )}

                            <Button
                              variant="outline"
                              className="w-full justify-start text-destructive"
                              onClick={() => {
                                setMobileMenuOpen(false);
                                logout();
                              }}
                              data-testid="button-mobile-sign-out"
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              Sign Out
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <Button
                              variant="outline"
                              onClick={() => {
                                openAuthModal("signin");
                                setMobileMenuOpen(false);
                              }}
                              className="w-full"
                              data-testid="button-mobile-sign-in"
                            >
                              Sign In
                            </Button>
                            <Button
                              onClick={() => {
                                openAuthModal("signup");
                                setMobileMenuOpen(false);
                              }}
                              className="w-full"
                              data-testid="button-mobile-sign-up"
                            >
                              Sign Up
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              )}

              {/* Desktop Auth */}
              {user ? (
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-10 w-10 rounded-full"
                        data-testid="button-user-menu"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback>
                            {user.displayName?.charAt(0).toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56 bg-white text-black border shadow-lg"
                      align="end"
                    >
                      <DropdownMenuItem className="flex items-center">
                        <User className="mr-2 h-4 w-4" />
                        <div className="flex flex-col flex-1">
                          <span className="font-medium">
                            {user.displayName || "User"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </div>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link href="/account" data-testid="link-account">
                          <User className="mr-2 h-4 w-4" />
                          Account
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link
                          href="/saved-alleys"
                          data-testid="link-saved-alleys"
                        >
                          <Bookmark className="mr-2 h-4 w-4" />
                          Saved Alleys
                        </Link>
                      </DropdownMenuItem>

                      {user && (user as any).ownedVenueIds && (user as any).ownedVenueIds.length > 0 && (
                        <DropdownMenuItem asChild>
                          <Link href="/my-venues">
                            <Building2 className="mr-2 h-4 w-4" />
                            My Venues
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuItem
                        onClick={logout}
                        data-testid="button-sign-out"
                        className="text-destructive focus:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="hidden md:flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => openAuthModal("signin")}
                    className="rounded-md border-gray-300 text-black hover:bg-gray-50"
                    data-testid="button-sign-in"
                  >
                    Sign In
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => openAuthModal("signup")}
                    className="rounded-md border-gray-300 text-black hover:bg-gray-50"
                    data-testid="button-sign-up"
                  >
                    Sign Up
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />
      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
      />
    </>
  );
}

