import { isMatch } from 'micromatch';

/**
 * True if path is excluded by either the path or glob criteria.
 * path may be to a directory or individual file.
 */
export const shouldExcludePath = (path: string, pathsToIgnore: Set<string>, globsToIgnore: string[]): boolean => {
  if (!path) return false

  return pathsToIgnore.has(path) || globsToIgnore.some(glob => glob && isMatch(path, glob));
}
