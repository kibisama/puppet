const chalk = require("chalk");
const dayjs = require("dayjs");

module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { name, color, page, fn } =
      req.app.get("cardinalPuppets")[puppetIndex];
    const { cin, q, type } = req.body;
    if (!cin && !(q && type)) {
      return res.status(400).send({ code: 400, message: "Bad Request" });
    }
    console.log(
      `${chalk[color](name + ":")} ${dayjs().format(
        "MM/DD/YY HH:mm:ss"
      )} Retrieving product details for "${cin || q}" ...`
    );
    let result;
    if (cin) {
      result = await fn.getProductDetails(page, cin);
    } else {
      const cin = await fn.search(page, q, type);
      if (typeof cin === "string") {
        result = await fn.getProductDetails(page, cin);
      } else if (cin == null) {
        return res.status(404).send({ code: 404, message: "Not Found" });
      } else if (cin instanceof Error) {
        result = cin;
      }
    }
    if (result instanceof Error) {
      return res.status(500).send({ code: 500, message: result.message });
    }
    res.status(200).send({ code: 200, data: result });
    next();
  } catch (e) {
    console.error(e);
    next(e);
  }
};
