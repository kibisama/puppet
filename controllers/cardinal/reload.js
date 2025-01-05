const CardinalPuppetError = require("../../puppets/cardinal/CardinalPuppetError");

module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { page, fn } = req.app.get("cardinalPuppets")[puppetIndex];
    const reload = await fn.reload(page);
    if (reload instanceof CardinalPuppetError) {
      return next(reload);
    }
    next("route");
  } catch (e) {
    const error = new CardinalPuppetError(e.message);
    next(error);
  }
};
