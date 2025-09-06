const chalk = require("chalk");
const dayjs = require("dayjs");

module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { name, color, page, fn } =
      req.app.get("cardinalPuppets")[puppetIndex];
    const { queries } = req.body;
    if (!queries.length) {
      res.status(400).send({ code: 400, message: "Bad Request" });
      return next();
    }
    console.log(
      `${chalk[color](name + ":")} ${dayjs().format(
        "MM/DD/YY HH:mm:ss"
      )} Searching a product with requested ${
        queries.length
      } queries including "${queries[0]}" ...`
    );
    let cin = "";
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      const result = await fn.search(page, query, "ndc");
      if (typeof result === "string") {
        cin = result;
        break;
      }
    }
    if (!cin) {
      res.status(404).send({ code: 404, message: "Not found" });
      return next();
    }
    const result = await fn.getProductDetails(page, cin);
    if (result instanceof Error) {
      res.status(500).send({ code: 500, message: result.message });
      return next();
    }
    res.status(200).send({ code: 200, data: result });
    next();
  } catch (e) {
    console.error(e);
    next(e);
  }
};
