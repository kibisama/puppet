const chalk = require("chalk");
const dayjs = require("dayjs");

module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { name, color, page, fn } =
      req.app.get("cardinalPuppets")[puppetIndex];
    let { cin, query } = req.body;
    console.log(
      `${chalk[color](name + ":")} ${dayjs().format(
        "MM/DD/YY HH:mm:ss"
      )} Retrieving product details for "${cin ?? query}" ...`
    );
    if (query) {
      const result = await fn.search(page, query);
      if (typeof result === "string") {
        cin = result;
      } else if (!result) {
        const error = new Error(`No results found for "${query}"`);
        error.status = 404;
        return next(error);
      } else if (result instanceof Error) {
        return next(result);
      }
    }
    const result = await fn.getProductDetails(page, cin);
    if (result instanceof Error) {
      return next(result);
    }
    res.send({ results: result });
    next();
  } catch (e) {
    next(e);
  }
};
