# Landing page: minimum requirements

The visual design is NOT specified here. Design each page fresh for the product: pick the
palette, type, layout and motion that fit its brand and audience. This file only lists what the
page must contain and the technical floor.

## Must contain

1. **Hero**: product name, a one-sentence selling point, and a primary call to action (usually
   "Deploy" or "Get started") plus a secondary link to the repository.
2. **Visual proof**: at least one real screenshot (from `docs/screenshots`) shown prominently.
3. **Feature summary**: the main capabilities, each with a short plain-language benefit.
4. **How to get started**: the real install or deploy steps, with the exact command and a way to
   copy it. Must match the README.
5. **Usage example**: a short code or API sample if the product has an API.
6. **Star and support call to action**: link to the repo's star target, issues, and sponsor link
   if one exists. Showing the live star count (fetched client side, failing silently) is
   optional.
7. **Footer**: licence, repository link, and a non-affiliation note when the product builds on a
   third-party platform.

## Technical floor

- Single self-contained `index.html` (inline CSS and JS); the workflow copies screenshots and
  the icon in at deploy time. No build step.
- Correct `title`, meta description and Open Graph tags (title, description, image, type).
- Works at phone width with no horizontal page scroll; readable in light and dark colour
  schemes; contrast and focus states accessible; respects reduced motion.
- No external fonts, trackers or CDNs. Images have alt text and below-the-fold ones are lazy.
- Every link and command was checked against the current repo; no invented claims or numbers.
- Final URL uses the repo's real Pages address (custom domain if one is configured).
