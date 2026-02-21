import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Star, User, Rocket, Users, ChevronRight, ChevronLeft, MapPin, MessageSquare, Wrench, Bookmark } from "lucide-react";
import { updateUserProfile } from "@/lib/firestore";
import { useToast } from "@/hooks/use-toast";

interface OnboardingModalProps {
  open: boolean;
  userId?: string;
  onComplete?: () => void;
  onOpenChange?: (open: boolean) => void;
}

const steps = [
  {
    icon: Users,
    title: "Welcome to BAiO — The Bowling Community",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          BAiO is built by bowlers, for bowlers.
        </p>
        <p className="text-muted-foreground">
          Every alley, every review, every detail on this platform exists because someone in the community helped make bowling better for everyone else.
        </p>
        <p className="font-medium text-primary">You're now part of that.</p>
        <p className="text-muted-foreground">
          Let's build the bowling map of America together.
        </p>
      </div>
    ),
  },
  {
    icon: User,
    title: "Your Profile — Your Bowling Identity",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          This is where people will see:
        </p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2 items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            The alleys you added
          </li>
          <li className="flex gap-2 items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            The reviews you've written
          </li>
          <li className="flex gap-2 items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            Your earned achievements
          </li>
          <li className="flex gap-2 items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            Your Pin Point total
          </li>
          <li className="flex gap-2 items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            Your community ranking
          </li>
        </ul>
        <p className="text-muted-foreground">
          Completing your profile helps alleys see who you are, and helps bowlers trust your recommendations.
        </p>
      </div>
    ),
  },
  {
    icon: Bookmark,
    title: "Save Alleys — Never Lose Track",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Found an alley you love? Want to remember one for your next trip? Save it.
        </p>
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
            <p className="text-muted-foreground">Build your personal list of favorite spots across the country.</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
            <p className="text-muted-foreground">Get notified when something changes — new hours, updated pricing, special events.</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-2" />
            <p className="text-muted-foreground">Access your saved alleys anytime from your profile.</p>
          </div>
        </div>
        <p className="font-medium text-primary pt-2">
          Your saved alleys = your personal bowling map.
        </p>
      </div>
    ),
  },
  {
    icon: Trophy,
    title: "Earn Pin Points — Level Up the Sport",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Pin Points are the heart of BAiO. You earn them by helping the community stay informed:
        </p>
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Add Missing Bowling Alleys</p>
              <p className="text-sm text-muted-foreground">If you know an alley we haven't listed, add it. You instantly help bowlers in that city.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <MessageSquare className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Leave Reviews for Alleys You've Visited</p>
              <p className="text-sm text-muted-foreground">Tell people what to expect — good lanes, bad lanes, great food, weird vibes, whatever. Bowlers rely on your experience.</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Wrench className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Suggest Corrections or Updates</p>
              <p className="text-sm text-muted-foreground">Hours changed? New ownership? Pricing wrong? Cosmic bowling on Fridays? You fix it → the whole community wins.</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground italic">
          As BAiO grows, we'll keep adding new ways to earn points — achievements, streaks, leaderboards, challenges, everything.
        </p>
      </div>
    ),
  },
  {
    icon: Target,
    title: "Why Pin Points Matter",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Pin Points show how much impact you've had on the bowling world.
        </p>
        <p className="font-medium">In the long run:</p>
        <ul className="space-y-2 text-muted-foreground">
          <li className="flex gap-2 items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            They rank you on the community leaderboard.
          </li>
          <li className="flex gap-2 items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            They unlock your public profile, showing everything you've contributed.
          </li>
          <li className="flex gap-2 items-center">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            They give you early access to new features, beta tools, and founding perks as BAiO grows.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground">
          And as we scale nationally, being an early super-user could genuinely turn into something valuable — influence, opportunities, and recognition inside the bowling ecosystem.
        </p>
        <div className="pt-2 border-t">
          <p className="font-medium text-primary">Your contributions build the sport.</p>
          <p className="font-medium text-primary">Your points reflect your legacy.</p>
        </div>
      </div>
    ),
  },
  {
    icon: Rocket,
    title: "Start With These Three Simple Actions",
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex gap-3 items-start">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">1</div>
            <p className="text-muted-foreground">Add your first alley or suggest one we missed.</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">2</div>
            <p className="text-muted-foreground">Leave 1–2 reviews from places you've bowled recently.</p>
          </div>
          <div className="flex gap-3 items-start">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium shrink-0">3</div>
            <p className="text-muted-foreground">Complete your profile so your contributions get credited.</p>
          </div>
        </div>
        <p className="font-medium text-primary pt-2">
          Do that, and you're already ahead of 99% of bowlers on the internet.
        </p>
      </div>
    ),
  },
  {
    icon: Star,
    title: "A Community That Grows Because of You",
    content: (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          Everything BAiO becomes —
        </p>
        <p className="text-muted-foreground pl-4 border-l-2 border-primary">
          every feature we add,<br />
          every tool we build for bowlers,<br />
          every national partnership —
        </p>
        <p className="text-muted-foreground">
          starts with people like you contributing a little bit every week.
        </p>
        <div className="pt-4 text-center">
          <p className="text-xl font-semibold text-primary">Welcome to the movement.</p>
          <p className="text-lg text-muted-foreground">Let's make bowling bigger than it's ever been.</p>
        </div>
      </div>
    ),
  },
];

export function OnboardingModal({ open, userId, onComplete, onOpenChange }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const progress = ((currentStep + 1) / steps.length) * 100;
  const isLastStep = currentStep === steps.length - 1;
  const CurrentIcon = steps[currentStep].icon;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = async () => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      await updateUserProfile(userId, { isOnboarded: true });
      onComplete?.();
      onOpenChange?.(false);
      toast({
        title: "Welcome to BAiO!",
        description: "You're all set. Start exploring and earning Pin Points!",
      });
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange ?? (() => {})}>
      <DialogContent 
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <VisuallyHidden>
          <DialogTitle>Welcome to BAiO Onboarding</DialogTitle>
        </VisuallyHidden>
        <div className="space-y-6">
          <Progress value={progress} className="h-2" />
          
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <CurrentIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Step {currentStep + 1} of {steps.length}</p>
              <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
            </div>
          </div>

          <div className="min-h-[200px]">
            {steps[currentStep].content}
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
              data-testid="button-onboarding-back"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={isSubmitting}
              data-testid="button-onboarding-next"
            >
              {isLastStep ? (
                isSubmitting ? "Completing..." : "Let's Go!"
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
