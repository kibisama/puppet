const chalk = require("chalk");
const dayjs = require("dayjs");

module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { name, color, page, fn } = req.app.get("psPuppets")[puppetIndex];
    const { ndc11, query } = req.body;
    const q = ndc11 || query;
    console.log(
      `${chalk[color](name + ":")} ${dayjs().format(
        "MM/DD/YY HH:mm:ss"
      )} Retrieving search results for "${q}" ...`
    );
    const search = ndc11
      ? await fn.search(page, ndc11)
      : await fn.textSearch(page, query);
    if (search instanceof Error) {
      return next(search);
    } else if (!search) {
      const error = new Error(`No results found for "${q}"`);
      error.status = 404;
      return next(error);
    } else {
      const results = await fn.getSearchResults(page);
      if (results instanceof Error) {
        return next(results);
      }
      const _value = await fn.getTextSearchValue(page);
      res.send({
        value: typeof _value === "string" ? _value : undefined,
        results,
      });
      next();
    }
  } catch (e) {
    next(error);
  }
};
