const chalk = require("chalk");
const dayjs = require("dayjs");

module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { name, color, page, fn } =
      req.app.get("cardinalPuppets")[puppetIndex];
    const { queries } = req.body;
    console.log(
      `${chalk[color](name + ":")} ${dayjs().format(
        "MM/DD/YY HH:mm:ss"
      )} Searching a product with requested ${
        queries.length
      } queries including "${queries[0]}" ...`
    );
    let cin = "";
    for (let i = 0; i < queries.length; i++) {
      const result = await fn.search(page, query);
      if (typeof result === "string") {
        cin = result;
        break;
      }
    }
    if (cin) {
      const results = await fn.getSubsAndAlts(page, cin);
      if (!(results instanceof Error)) {
        res.send({ results });
        return next();
      }
    }
    const error = new Error("No results found");
    error.status = 404;
    return next(error);
  } catch (e) {
    next(e);
  }
};
