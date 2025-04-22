const DiffMatchPatch = require('diff-match-patch');

/**
 * Utility functions for document versioning
 */
class VersionUtils {
  constructor() {
    this.dmp = new DiffMatchPatch();
  }

  /**
   * Generate a diff between two text strings
   * @param {string} oldText - The previous text
   * @param {string} newText - The new text
   * @returns {string} - JSON string containing the diff
   */
  createDiff(oldText, newText) {
    const diff = this.dmp.diff_main(oldText || '', newText || '');
    this.dmp.diff_cleanupSemantic(diff);
    return JSON.stringify(diff);
  }

  /**
   * Apply a diff to a text string
   * @param {string} text - The text to patch
   * @param {string} diffString - JSON string containing the diff
   * @returns {string} - The resulting text after applying the diff
   */
  applyDiff(text, diffString) {
    try {
      const diff = JSON.parse(diffString);
      const patches = this.dmp.patch_make(text || '', diff);
      const [result] = this.dmp.patch_apply(patches, text || '');
      return result;
    } catch (error) {
      console.error('Error applying diff:', error);
      return text;
    }
  }

  /**
   * Get a human-readable summary of a diff
   * @param {string} diffString - JSON string containing the diff
   * @returns {string} - A human-readable description of the changes
   */
  getDiffSummary(diffString) {
    try {
      const diff = JSON.parse(diffString);
      let insertions = 0;
      let deletions = 0;
      let changes = 0;

      diff.forEach(([operation, text]) => {
        if (operation === -1) { // Deletion
          deletions += text.length;
        } else if (operation === 1) { // Insertion
          insertions += text.length;
        }
      });

      // Count changes as sequences of deletion followed by insertion
      for (let i = 0; i < diff.length - 1; i++) {
        if (diff[i][0] === -1 && diff[i+1][0] === 1) {
          changes += Math.min(diff[i][1].length, diff[i+1][1].length);
          deletions -= Math.min(diff[i][1].length, diff[i+1][1].length);
          insertions -= Math.min(diff[i][1].length, diff[i+1][1].length);
        }
      }

      // Create a summary
      const summary = [];
      if (insertions > 0) summary.push(`Added ${insertions} characters`);
      if (deletions > 0) summary.push(`Removed ${deletions} characters`);
      if (changes > 0) summary.push(`Changed ${changes} characters`);

      return summary.join(', ') || 'No changes';
    } catch (error) {
      console.error('Error generating diff summary:', error);
      return 'Unknown changes';
    }
  }
}

module.exports = new VersionUtils(); 