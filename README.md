# events.gobwlng.uk

The new page for bowling tournaments we run. These should at first be simple pages using data stored on git for now,
using a simple metadata file to handle all the events we have scores for.

## Why?

Why this, why now? It is a simple and easy ‘win’ for the new year. Something that starts it off as we mean to go on.
A new year for the bowling alley. But, the real reason behind the project. Scraping bowlers scores,
I want this year to be able to offer each bowler a 2026 wrapped of their year bowling, where they can look back at
how they did in each event we ran, also events I can get results from. Merging that data with a new league cron job
so they can see how they did in both leagues and tournaments, and they can use the data as a bragging point

## Architecture

- Backed by git. Data stored in a CSV file, either TSV formatted or CSV formatted.
- Hosted on [Cloudflare](https://pages.cloudflare.com/) pages. Using dynamic routing to handle multiple events
- Using pure HTML and JS to handle page generation.
- `posthog` for simple analytics, see if people are viewing or not
- `tailwind` for styling.
- Cloudflare KV, used for share links
- Cloudflare AnalyticsEngine, for function analytics
