const cardinalPuppet = require("./cardinal/cardinalPuppet");
const psPuppet = require("./pharmsaver/psPuppet");
module.exports = async (app) => {
  const puppets = await Promise.all([
    cardinalPuppet({ name: "CARDINAL_1", color: "red" }),
    cardinalPuppet({ name: "CARDINAL_2", color: "magenta" }),
    psPuppet({ name: "PHARMSAVER_1", color: "blue" }),
    psPuppet({ name: "PHARMSAVER_2", color: "cyan" }),
  ]);
  app.set("cardinalPuppets", [puppets[0], puppets[1]]);
  app.set("cardinalPuppetsOccupied", [false, false]);
  app.set("psPuppets", [puppets[2], puppets[3]]);
  app.set("psPuppetsOccupied", [false, false]);
};
