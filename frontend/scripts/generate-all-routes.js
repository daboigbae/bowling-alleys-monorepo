const fs = require('fs');
const path = require('path');

const frontendAppDir = path.join(__dirname, '../app');
const pagesDir = path.join(__dirname, '../components/pages');

// Get all page files
const pageFiles = fs.readdirSync(pagesDir)
  .filter(f => f.endsWith('.tsx') && f !== 'not-found.tsx')
  .map(f => f.replace('Page.tsx', '').replace('.tsx', ''));

// Route mapping: page name -> route path
const routeMap = {
  // Static routes
  'About': 'about',
  'Account': 'account',
  'Contact': 'contact',
  'Terms': 'terms',
  'Privacy': 'privacy',
  'Experiences': 'experiences',
  'Owner': 'owner',
  'FoundingPartners': 'founding-partners',
  'PitchDeck': 'pitch-deck',
  'Profile': 'profile',
  'Team': 'team',
  'TeamLogoLab': 'team-logo-lab',
  'SavedAlleys': 'saved-alleys',
  'MyVenues': 'my-venues',
  
  // Dynamic routes with [[...params]]
  'BowlingLeagues': 'bowling-leagues/[[...params]]',
  'CosmicBowling': 'cosmic-bowling/[[...params]]',
  'OpenBowling': 'open-bowling/[[...params]]',
  'Specials': 'specials/[[...params]]',
  'KidsBowling': 'kids-bowling/[[...params]]',
  'BattingCages': 'batting-cages/[[...params]]',
  'BowlingBirthdayParty': 'bowling-birthday-party/[[...params]]',
  'BowlingCost': 'bowling-cost/[[...params]]',
  'ArcadeBowling': 'arcade-bowling/[[...params]]',
  'BowlingLessons': 'bowling-lessons/[[...params]]',
  'SeniorBowling': 'senior-bowling/[[...params]]',
  'CorporateEvents': 'corporate-events/[[...params]]',
  'BowlingRestaurant': 'bowling-restaurant/[[...params]]',
  'BowlingBar': 'bowling-bar/[[...params]]',
  'SportsBar': 'sports-bar/[[...params]]',
  'SnackBar': 'snack-bar/[[...params]]',
  'BowlingBilliards': 'bowling-billiards/[[...params]]',
  'BowlingPingPong': 'ping-pong/[[...params]]',
  'ProShop': 'pro-shop/[[...params]]',
  'LaserTag': 'laser-tag/[[...params]]',
  'KaraokeBowling': 'karaoke-bowling/[[...params]]',
  'DuckpinBowling': 'duckpin-bowling/[[...params]]',
  'CandlepinBowling': 'candlepin-bowling/[[...params]]',
  'WheelchairAccessible': 'wheelchair-accessible/[[...params]]',
  'EscapeRooms': 'escape-rooms/[[...params]]',
  'Tournaments': 'tournaments/[[...params]]',
  // City hubs: handled by app/[slug]/page.tsx + lib/cityHubsConfig.ts (add new cities there)
};

// Routes that already exist (don't regenerate)
const existingRoutes = [
  'about', 'account', 'blog', 'bowling-leagues', 'contact', 'cosmic-bowling',
  'experiences', 'founding-partners', 'locations', 'my-venues', 'not-found',
  'open-bowling', 'owner', 'pitch-deck', 'privacy', 'profile', 'saved-alleys',
  'team', 'team-logo-lab', 'terms', 'tournaments', 'u', 'venue'
];

function generateRoutePage(pageName, routePath) {
  const targetDir = path.join(frontendAppDir, routePath);
  fs.mkdirSync(targetDir, { recursive: true });
  
  const isDynamic = routePath.includes('[[...params]]');
  const pageComponentName = `${pageName}Page`;
  
  let pageContent;
  if (isDynamic) {
    pageContent = `'use client';

import dynamic from 'next/dynamic';

const ${pageComponentName} = dynamic(() => import('@/components/pages/${pageComponentName}'), {
  ssr: true,
});

export default function ${pageName}({ params }: { params?: { params?: string[] } }) {
  const state = params?.params?.[0];
  const city = params?.params?.[1];
  return <${pageComponentName} state={state} city={city} />;
}
`;
  } else {
    pageContent = `'use client';

import dynamic from 'next/dynamic';

const ${pageComponentName} = dynamic(() => import('@/components/pages/${pageComponentName}'), {
  ssr: true,
});

export default function ${pageName}() {
  return <${pageComponentName} />;
}
`;
  }
  
  const pageFile = path.join(targetDir, 'page.tsx');
  if (!fs.existsSync(pageFile)) {
    fs.writeFileSync(pageFile, pageContent);
    console.log(`Generated: ${routePath}/page.tsx`);
  } else {
    console.log(`Skipped (exists): ${routePath}/page.tsx`);
  }
}

// Generate routes
Object.entries(routeMap).forEach(([pageName, routePath]) => {
  const routeBase = routePath.split('/')[0];
  if (!existingRoutes.includes(routeBase)) {
    generateRoutePage(pageName, routePath);
  }
});

console.log(`\nGenerated route pages for ${Object.keys(routeMap).length} pages.`);


