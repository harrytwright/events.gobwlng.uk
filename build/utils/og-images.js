import satori from 'satori';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// Brand colors
const COLORS = {
  firebrick: '#b22222',
  firebrickDark: '#8b1a1a',
  pin: '#efefef',
  gray900: '#111827',
  gray600: '#4b5563',
  gray500: '#6b7280',
  gray200: '#e5e7eb',
  white: '#ffffff',
};

// Badge icon SVG paths (from Heroicons, 24x24 viewBox)
const BADGE_ICONS = {
  // Format - users/group icon
  format: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  // Type - tag icon
  type: 'M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z M6 6h.008v.008H6V6Z',
  // Category - ID card icon
  category: 'M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z',
  // Pattern - paintbrush icon
  pattern: 'M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z',
  // Date - calendar icon
  date: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-6h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z',
};

let cachedLogo = null;

// Font URLs (Google Fonts - using TTF format)
const FONT_URLS = {
  // Using Google Fonts API to get TTF versions
  montserratBold: 'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Bold.ttf',
  montserratBlack: 'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Black.ttf',
  montserratSemiBold: 'https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-SemiBold.ttf',
  roboto: 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Regular.ttf',
  robotoBlack: 'https://github.com/googlefonts/roboto/raw/main/src/hinted/Roboto-Black.ttf',
};

let cachedFonts = null;

/**
 * Load fonts from Google Fonts (cached after first load)
 */
async function loadFonts() {
  if (cachedFonts) return cachedFonts;

  const [montserratBoldData, montserratBlackData, montserratSemiBoldData, robotoData, robotoBlackData] = await Promise.all([
    fetch(FONT_URLS.montserratBold).then((res) => res.arrayBuffer()),
    fetch(FONT_URLS.montserratBlack).then((res) => res.arrayBuffer()),
    fetch(FONT_URLS.montserratSemiBold).then((res) => res.arrayBuffer()),
    fetch(FONT_URLS.roboto).then((res) => res.arrayBuffer()),
    fetch(FONT_URLS.robotoBlack).then((res) => res.arrayBuffer()),
  ]);

  cachedFonts = [
    {
      name: 'Montserrat',
      data: montserratBoldData,
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Montserrat',
      data: montserratBlackData,
      weight: 900,
      style: 'normal',
    },
    {
      name: 'Montserrat',
      data: montserratSemiBoldData,
      weight: 600,
      style: 'normal',
    },
    {
      name: 'Roboto',
      data: robotoData,
      weight: 400,
      style: 'normal',
    },
    {
      name: 'Roboto',
      data: robotoBlackData,
      weight: 900,
      style: 'normal',
    }
  ];

  return cachedFonts;
}

/**
 * Load and convert logo SVG to PNG base64 (cached after first load)
 */
async function loadLogo() {
  if (cachedLogo) return cachedLogo;

  try {
    const logoPath = path.join(ROOT_DIR, 'static', 'assets', 'logo-2-masked.svg');
    const svgBuffer = await fs.readFile(logoPath);

    // Convert SVG to PNG using sharp (resize to larger size for quality at different display sizes)
    const pngBuffer = await sharp(svgBuffer)
      .resize(200, 200)
      .png()
      .toBuffer();

    cachedLogo = `data:image/png;base64,${pngBuffer.toString('base64')}`;
    return cachedLogo;
  } catch (err) {
    console.warn('  ! Could not load logo:', err.message);
    return null;
  }
}

/**
 * Create an icon SVG element for satori
 */
function createIcon(iconPath, size = 14) {
  return {
    type: 'svg',
    props: {
      xmlns: 'http://www.w3.org/2000/svg',
      fill: 'none',
      viewBox: '0 0 24 24',
      strokeWidth: 1.5,
      stroke: 'currentColor',
      width: size,
      height: size,
      style: { flexShrink: 0 },
      children: {
        type: 'path',
        props: {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          d: iconPath,
        },
      },
    },
  };
}

/**
 * Create a badge with icon for satori
 */
function createBadge(badge) {
  const iconPath = BADGE_ICONS[badge.type];
  const label = badge.label || badge;

  const children = [];

  if (iconPath) {
    children.push(createIcon(iconPath, 14));
  }

  children.push({
    type: 'span',
    props: {
      children: label,
    },
  });

  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        backgroundColor: COLORS.gray200,
        borderRadius: 6,
        fontSize: 16,
        color: COLORS.gray600,
        fontFamily: 'Roboto',
      },
      children,
    },
  };
}

/**
 * Truncate text with ellipsis
 */
function truncate(text, maxLength = 120) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

/**
 * Create event OG image layout (satori format)
 */
function createEventLayout(data, logoSrc = null) {
  const badges = data.badges || [];

  // Build badge row with logo at the end
  const badgeChildren = badges.map((badge) => createBadge(badge));

  // Add logo inline with badges if available
  if (logoSrc) {
    badgeChildren.push({
      type: 'div',
      props: {
        style: {
          marginLeft: 'auto',
          display: 'flex',
          alignItems: 'center',
        },
        children: {
          type: 'img',
          props: {
            src: logoSrc,
            width: 96,
            height: 96,
            style: {
              borderRadius: 12,
            },
          },
        },
      },
    });
  }

  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.pin} 100%)`,
        padding: '60px',
        position: 'relative',
      },
      children: [
        // Main content container
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
            },
            children: [
              // EVENT label
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 14,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: COLORS.gray500,
                    fontFamily: 'Roboto',
                  },
                  children: 'EVENT',
                },
              },
              // Event name
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 56,
                    fontWeight: 700,
                    color: COLORS.gray900,
                    marginTop: 16,
                    fontFamily: 'Montserrat',
                    lineHeight: 1.1,
                  },
                  children: data.name || 'Tournament Results',
                },
              },
              // Description
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: 24,
                    color: COLORS.gray600,
                    marginTop: 24,
                    fontFamily: 'Roboto',
                    lineHeight: 1.4,
                  },
                  children: truncate(data.description),
                },
              },
              // Badges container with logo
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 12,
                    marginTop: 'auto',
                    marginBottom: 40,
                  },
                  children: badgeChildren,
                },
              },
            ],
          },
        },
        // Firebrick gradient bar at bottom
        {
          type: 'div',
          props: {
            style: {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 8,
              background: `linear-gradient(90deg, ${COLORS.firebrick} 0%, ${COLORS.firebrickDark} 100%)`,
            },
          },
        },
      ],
    },
  };
}

/**
 * Create index OG image layout (satori format)
 */
function createIndexLayout(logoSrc = null) {
  const children = [
    // Text content - top left
    {
      type: 'div',
      props: {
        style: {
          display: 'flex',
          flexDirection: 'column',
          padding: 64,
        },
        children: [
          // "GoBowling" - brand name, black weight
          {
            type: 'div',
            props: {
              style: {
                fontSize: 32,
                fontWeight: 900,
                color: COLORS.gray900,
                fontFamily: 'Roboto',
                marginBottom: 8,
              },
              children: 'GoBowling',
            },
          },
          // "Tournament Results" - primary, semibold
          {
            type: 'div',
            props: {
              style: {
                fontSize: 72,
                fontWeight: 800,
                color: COLORS.gray900,
                fontFamily: 'Montserrat',
                lineHeight: 1.1,
              },
              children: 'Tournament Results',
            },
          },
        ],
      },
    },
    // Firebrick gradient bar at bottom
    {
      type: 'div',
      props: {
        style: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 8,
          background: `linear-gradient(90deg, ${COLORS.firebrick} 0%, ${COLORS.firebrickDark} 100%)`,
        },
      },
    },
  ];

  // Add logo bottom-right if available
  if (logoSrc) {
    children.push({
      type: 'img',
      props: {
        src: logoSrc,
        width: 192,
        height: 192,
        style: {
          position: 'absolute',
          bottom: 48,
          right: 64,
          borderRadius: 24,
        },
      },
    });
  }

  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: `linear-gradient(180deg, ${COLORS.white} 0%, ${COLORS.pin} 100%)`,
        position: 'relative',
      },
      children,
    },
  };
}

/**
 * Generate a PNG image from a satori layout
 */
async function generateImage(layout, fonts) {
  // Convert to SVG using satori
  const svg = await satori(layout, {
    width: 1200,
    height: 630,
    fonts,
  });

  // Convert SVG to PNG using sharp
  const png = await sharp(Buffer.from(svg))
    .png()
    .toBuffer();

  return png;
}

/**
 * Generate all OG images for events and index
 */
export async function generateOgImages(distDir, eventsData) {
  console.log('Generating OG images...');

  const fonts = await loadFonts();
  const logoSrc = await loadLogo();
  const ogDir = path.join(distDir, 'og');

  // Generate index OG image
  const indexLayout = createIndexLayout(logoSrc);
  const indexPng = await generateImage(indexLayout, fonts);
  await fs.mkdir(ogDir, { recursive: true });
  await fs.writeFile(path.join(ogDir, 'index.png'), indexPng);
  console.log('  -> dist/og/index.png');

  // Generate event OG images
  for (const event of eventsData) {
    const ogDataPath = path.join(distDir, 'og-data', 'events', event.slug, `${event.year}.json`);

    try {
      const ogDataContent = await fs.readFile(ogDataPath, 'utf-8');
      const ogData = JSON.parse(ogDataContent);

      const eventLayout = createEventLayout(ogData, logoSrc);
      const eventPng = await generateImage(eventLayout, fonts);

      const eventOgDir = path.join(ogDir, event.slug);
      await fs.mkdir(eventOgDir, { recursive: true });
      await fs.writeFile(path.join(eventOgDir, `${event.year}.png`), eventPng);
      console.log(`  -> dist/og/${event.slug}/${event.year}.png`);
    } catch (err) {
      console.error(`  ! Failed to generate OG image for ${event.slug}/${event.year}: ${err.message}`);
    }
  }
}
