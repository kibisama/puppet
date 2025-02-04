module.exports = async (req, res, next) => {
  try {
    const { puppetIndex } = res.locals;
    const { page, fn } = req.app.get("cardinalPuppets")[puppetIndex];
    const reload = await fn.reload(page);
    if (reload instanceof Error) {
      return next(reload);
    }
    next();
  } catch (e) {
    next(e);
  }
};
