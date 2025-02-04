const chalk = require("chalk");
const dayjs = require("dayjs");

module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { name, color, page, fn } = req.app.get("psPuppets")[puppetIndex];
    const { ndc11 } = req.body;
    console.log(
      `${chalk[color](name + ":")} ${dayjs().format(
        "MM/DD/YY HH:mm:ss"
      )} Retrieving search results for "${ndc11}" ...`
    );
    const search = await fn.search(page, ndc11);
    if (search instanceof Error) {
      return next(search);
    } else if (!search) {
      const error = new Error(`No results found for "${ndc11}"`);
      error.status = 404;
      return next(error);
    } else {
      const results = await fn.getSearchResults(page);
      if (results instanceof Error) {
        return next(results);
      }
      res.send({
        results,
      });
      next();
    }
  } catch (e) {
    next(error);
  }
};
