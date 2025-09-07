const chalk = require("chalk");
const dayjs = require("dayjs");

module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { name, color, page, fn } = req.app.get("psPuppets")[puppetIndex];
    const { q } = req.body;
    console.log(
      `${chalk[color](name + ":")} ${dayjs().format(
        "MM/DD/YY HH:mm:ss"
      )} Retrieving search results for "${q}" ...`
    );
    const search = await fn.search(page, q);
    if (search instanceof Error) {
      res.status(500).send({ code: 500, message: search.message });
      return next();
    } else if (!search) {
      res.status(404).send({ code: 404, message: "Not Found" });
      return next();
    } else {
      const results = await fn.getSearchResults(page);
      if (results instanceof Error) {
        res.status(500).send({ code: 500, message: results.message });
        return next();
      }
      const inputValue = await fn.getTextSearchValue(page);
      res.status(200).send({
        code: 200,
        data: {
          inputValue: typeof inputValue === "string" ? inputValue : undefined,
          results,
        },
      });
      next();
    }
  } catch (e) {
    console.error(e);
    next(error);
  }
};
