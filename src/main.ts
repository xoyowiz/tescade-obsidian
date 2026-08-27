
import { MarkdownView, Notice, Plugin, TFile } from 'obsidian';

/**
 * Matches Obsidian wikilinks that refer to another note.
 *
 * The note name is captured while optional aliases (`|alias`) and
 * heading/block references (`#...`) are ignored for resolution.
 */
const WIKILINK_PATTERN = /\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]/g;

/**
 * Base error type for errors raised while resolving a Tescade document.
 */
class TescadeError extends Error {}

/**
 * Raised when resolving a wikilink would cause a file to be processed
 * more than once along the current resolution path.
 */
class CircularIncludeError extends TescadeError {}

/**
 * Raised when a wikilink cannot be resolved to a file in the vault.
 */
class MissingFileError extends TescadeError {}

/**
 * Obsidian plugin entry point for Tescade.
 *
 * Tescade recursively replaces wikilinks with the contents of the
 * referenced notes and writes the resulting document to a separate
 * "-resolved" file.
 */
export default class TescadePlugin extends Plugin {
	async onload() {
		/**
		 * Register the main Tescade command.
		 *
		 * The command is only available when a Markdown note is currently
		 * open, since resolution starts from the active note.
		 */
		this.addCommand({
			id: 'resolve-file',
			name: 'Resolve file',
			checkCallback: (checking) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);

				if (!view?.file) {
					return false;
				}

				if (!checking) {
					void this.resolveActiveFile(view.file);
				}

				return true;
			},
		});
	}

	/**
	 * Resolve the active note and write the result beside the original.
	 *
	 * Existing "-resolved" files are overwritten. The source note itself
	 * is never modified.
	 */
	private async resolveActiveFile(file: TFile): Promise<void> {
		try {
			const resolved = await this.resolveFile(file, []);

			// Construct the output path using the original file's directory
			// and basename, avoiding the extension-related filename issue.
			const outputPath =
				file.parent?.path
				? `${file.parent.path}/${file.basename}-resolved.${file.extension}`
				: `${file.basename}-resolved.${file.extension}`;

			const existing = this.app.vault.getAbstractFileByPath(outputPath);

			// Update an existing resolved file, or create one if it does not exist.
			if (existing) {
				if (!(existing instanceof TFile)) {
					throw new TescadeError(
						`Output path is not a file: ${outputPath}`,
					);
				}

				await this.app.vault.modify(existing, resolved);
			} else {
				await this.app.vault.create(outputPath, resolved);
			}

			new Notice(`Resolved: ${outputPath}`);
		} catch (error) {
			// Convert any resolution error into a user-visible Obsidian notice.
			const message =
				error instanceof Error ? error.message : String(error);

			new Notice(`Tescade: ${message}`);
		}
	}

	/**
	 * Resolve a single file recursively.
	 *
	 * `stack` contains the files currently being resolved. It is used to
	 * detect circular references without preventing the same note from
	 * appearing independently in different branches of the document.
	 */
	private async resolveFile(
		file: TFile,
		stack: string[],
	): Promise<string> {
		if (stack.includes(file.path)) {
			const chain = [...stack, file.path].join(' → ');
			throw new CircularIncludeError(
				`circular link detected: ${chain}`,
			);
		}

		const text = await this.app.vault.read(file);

		return this.resolveText(text, file, [...stack, file.path]);
	}

	/**
	 * Replace every wikilink in a piece of text with the recursively
	 * resolved contents of its target file.
	 *
	 * Text that is not part of a wikilink is copied unchanged.
	 */
	private async resolveText(
		text: string,
		currentFile: TFile,
		stack: string[],
	): Promise<string> {
		const matches = [...text.matchAll(WIKILINK_PATTERN)];

		// Avoid rebuilding the string when the file contains no wikilinks.
		if (matches.length === 0) {
			return text;
		}

		let result = '';
		let lastIndex = 0;

		for (const match of matches) {
			const fullMatch = match[0];
			const linkTarget = match[1]?.trim();

			if (!linkTarget) {
				throw new TescadeError(`Invalid wikilink in ${currentFile.path}`);
			}
			const matchIndex = match.index!;

			// Preserve everything between this wikilink and the previous one.
			result += text.slice(lastIndex, matchIndex);

			// Let Obsidian resolve the wikilink according to its own vault
			// and link-resolution rules rather than treating it as a path.
			const linkedFile = this.app.metadataCache.getFirstLinkpathDest(
				linkTarget,
				currentFile.path,
			);

			if (!linkedFile) {
				throw new MissingFileError(
					`file not found for wikilink: [[${linkTarget}]] in ${currentFile.path}`,
				);
			}

			// Replace the wikilink itself with the complete contents of the
			// referenced file, recursively resolving any links it contains.
			result += await this.resolveFile(linkedFile, stack);

			lastIndex = matchIndex + fullMatch.length;
		}

		// Preserve the text following the final wikilink.
		result += text.slice(lastIndex);

		return result;
	}
}