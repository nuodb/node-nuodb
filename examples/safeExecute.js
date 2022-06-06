const safeExecute = async (retryLimit, work, prepwork, mutables) => {
  let success = false;
  let result = null;
  let err = null;
  for(let i = 0;i < retryLimit && !success; i++) {
    try {
      const prepworkResults = await prepwork?.call(mutables, err);
      result = await work(prepworkResults ?? mutables);
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
