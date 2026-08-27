# Tescade

Tescade is a tiny Obsidian plugin for recursively resolving wikilinks into a standalone Markdown file.

It treats `[[wikilinks]]` as instructions to insert the contents of the referenced note at that exact location.

## How it works

Given a note:

```markdown
This is the main note.

[[Another Note]]

This is the end.
```

where `Another Note.md` contains:

```markdown
This comes from another note.

[[Third Note]]
```

and `Third Note.md` contains:

```markdown
This comes from the third note.
```

Tescade produces:

```text
Main Note-resolved.md
```

containing:

```markdown
This is the main note.

This comes from another note.

This comes from the third note.

This is the end.
```

The original notes are not modified.

## Usage

Open the Markdown note you want to resolve.

From the Obsidian Command Palette, run:

```text
Tescade: Resolve file
```

Tescade recursively follows the note's wikilinks and creates a `-resolved.md` file next to the original.

For example:

```text
My Document.md
My Document-resolved.md
```

## Recursive resolution

Wikilinks are resolved recursively.

```text
A
└── [[B]]
    └── [[C]]
        └── [[D]]
```

Resolving `A` inserts the contents of `B`, `C`, and `D` into the resulting document.

## Circular links

Tescade detects circular references and stops with an error instead of recursively processing the same files forever.

For example:

```text
A → B → C → A
```

will be reported as a circular link.

## Missing files

If a wikilink cannot be resolved to a file in the vault, Tescade reports an error rather than silently omitting the link.

## Design

Tescade is intentionally simple.

Its purpose is to provide a straightforward Markdown composition mechanism:

```text
[[Note]]
```

becomes:

```text
contents of Note
```

and this process continues recursively.

The resolved file is a generated artifact; the source notes remain unchanged.

## Installation

### Manual installation

Build the plugin and copy the plugin directory into:

```text
YourVault/.obsidian/plugins/tescade/
```

The directory must contain at least:

```text
tescade/
├── main.js
└── manifest.json
```

Then enable **Tescade** under:

**Settings → Community plugins → Installed plugins**

## Development

Install dependencies:

```bash
npm install
```

Run the development build:

```bash
npm run dev
```

This watches the source files and rebuilds `main.js` whenever they change.

For a production build:

```bash
npm run build
```

## Non-goals

Tescade is not intended to be a general-purpose publishing or export system.

It does not attempt to provide:

* templates
* variables
* scripting
* conditionals
* loops
* macros
* document formatting
* graph-based export configuration

Its purpose is simply **recursive text composition through Obsidian wikilinks**.


## DISCLAIMERS

> **LLM assistance:** Portions of the code and accompanying documentation were formatted, refined, or partially generated with the assistance of a large language model (LLM). The resulting code was reviewed and tested by the author, but LLM assistance was used as part of the development process.

> **Project scope:** As of the current version (1.0.0), no further features are intended to be added to Tescade. The project is deliberately kept small and focused on its core purpose of recursively resolving Obsidian wikilinks into standalone Markdown files.
