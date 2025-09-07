module.exports = (req, res, next) => {
  const psPuppetsOccupied = req.app.get("psPuppetsOccupied");
  for (let i = 0; i < psPuppetsOccupied.length; i++) {
    if (!psPuppetsOccupied[i]) {
      psPuppetsOccupied[i] = true;
      res.locals.puppetIndex = i;
      res.locals.puppetType = "PS";
      break;
    }
  }
  if (res.locals.puppetIndex == undefined) {
    return res
      .status(503)
      .send({ code: 503, message: "All Pharmsaver puppets are busy." });
  }
  next();
};
