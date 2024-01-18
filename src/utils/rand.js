function randN(start, end) {
  const count = end - start + 1;
  return Math.floor(Math.random() * count) + start
}

module.exports = {
  randN: randN
}