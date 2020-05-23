function __TS__StringReplace(
    this: void,
    source: string,
    searchValue: string,
    replaceValue: string | ((substring: string) => string),
    // Whether to filter out the searchValue
    dontFilter: boolean | undefined
): string {
    if (dontFilter) {
      if (typeof replaceValue === "string") {
        const [result] = string.gsub(source, searchValue, replaceValue, 1);
        return result;
      } else {
        const [result] = string.gsub(
          source,
          searchValue,
          match => (replaceValue as (substring: string) => string)(match),
            1
        );
        return result;
      }
    }

    [searchValue] = string.gsub(searchValue, "[%%%(%)%.%+%-%*%?%[%^%$]", "%%%1");

    if (typeof replaceValue === "string") {
        [replaceValue] = string.gsub(replaceValue, "[%%%(%)%.%+%-%*%?%[%^%$]", "%%%1");
        const [result] = string.gsub(source, searchValue, replaceValue, 1);
        return result;
    } else {
        const [result] = string.gsub(
            source,
            searchValue,
            match => (replaceValue as (substring: string) => string)(match),
            1
        );
        return result;
    }
}
