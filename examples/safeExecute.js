const safeExecute = async (retryLimit, work, prework, mutables) => {
  let success = false;
  let result = null;
  let err = null;
  for(let i = 0;i < retryLimit && !success; i++) {
    try {
      const preworkResults = await prework(mutables, err);
      result = await work(preworkResults ?? mutables);
      success = true;
    } catch (e) {
      err = e;
      success = false;
    }
  }
  if (success) {
    return result
  } else {
    throw err;
  }
}
module.exports = safeExecute;
