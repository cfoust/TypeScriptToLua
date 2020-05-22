function __TS__StringIncludes(this: string, searchString: string): boolean {
  const [, replacements] = string.gsub(this, searchString, '', 1)
  return replacements === 1
}
