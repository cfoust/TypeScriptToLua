function __TS__ArrayEntries<T>(this: T[]): Array<[number, T]> {
  let result: Array<[number, T]> = []

  for (const value of this) {
    result[result.length] = [result.length, value]
  }

  return result
}
