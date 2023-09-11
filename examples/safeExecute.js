const safeExecute = async (retryLimit, work, prepwork, mutables) => {
  let success = false;
  let result = null;
  let err = null;
  var prepworkResults;
  for(let i = 0;i < retryLimit && !success; i++) {
    try {
      //prepworkResults = await prepwork?.call(mutables, err);
      prepworkResults = await prepwork?.call(this,mutables, err);
      result = await work(prepworkResults ?? mutables);
      success = true;
      err = null;
    } catch (e) {
      err = e;
      console.log(e);
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
