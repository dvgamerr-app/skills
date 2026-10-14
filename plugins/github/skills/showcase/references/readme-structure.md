# README structure that converts

Order, top to bottom. Each block has one job.

1. **Centered header**: project name, one-line bold selling point, one supporting sentence that
   names what the reader avoids (SaaS fees, third parties, build steps).
2. **Badges** (for-the-badge style, brand colour): stars, latest release, licence, image
   registry and architectures.
3. **Link row**: Website, Quick start anchor, Self-hosting guide, other-language README.
4. **Three screenshots** side by side, about 230 px wide.
5. **Star call to action**, bold, one sentence with the reason ("helps other developers find it").
6. **Why**: three or four bullets that start with the benefit in bold. The first bullet is the
   selling point.
7. **Features table**: emoji, bold name, one sentence. Eight to ten rows. Group nothing.
8. **More screenshots** in a collapsed details block.
9. **Deploy in 5 minutes**: numbered, copy-pasteable. Provider-side setup first, then the real
   commands (download compose file, download env example, edit named variables, up -d). Link
   to the self-hosting guide for databases, backups and upgrades.
10. **Use it** example: a single curl or code sample with the main API.
11. **Architecture**: small ASCII diagram plus the stack in one sentence.
12. **Documentation links**, **Develop** commands, then **Support the project** with star, issues
    and sponsor links, and an optional star-history chart.

Rules:
- Every command must work as written against the current repo. Run or inspect them.
- Prefer concrete numbers (5 minutes, 3 settings, 20 rooms) taken from the code.
- Keep the translated README structurally identical but shorter on reference detail.
- Move the old long README to `docs/` (rename the heading) instead of deleting it, and link it.
- Do not put secrets or real hostnames in examples; use `YOUR_DOMAIN` and `REPLACE_ME`.
- Avoid claims you cannot back up (no "enterprise-grade", no benchmarks you did not run).

## Self-hosting guide (docs/self-hosting.md)

Sections: requirements, provider-side setup, configuration (required table, optional table),
run, HTTPS options table, database options, upgrade, backup, scheduled jobs, troubleshooting
table keyed by the exact symptom or error text.
