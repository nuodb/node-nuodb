
// This was initially written in typescript, all typescript related fields have been commented out but left for posterity

// export interface LoopDeferProps<CHUNKPROPS> {
//   props: CHUNKPROPS;
//   loopCondition: (props?: CHUNKPROPS) => Promise<boolean>;
//   body?: (props?: CHUNKPROPS) => Promise<void>;
//   setup?: (props?: CHUNKPROPS) => CHUNKPROPS;
//   increment?: (props?: CHUNKPROPS) => Promise<CHUNKPROPS>;
//   closure?: (props?: CHUNKPROPS) => void;
//   that?: any;
// }

/**
 *
 * @param loopCondition Returns a boolean and controls when the loop stops (runs with the value returned by setup before the first run begins, with value returned by increment all other times)
 * @param body The main looping body
 * @param setup Function that will be run prior to the loop start, the value of which will be used as props for the first run of the loop, if it passes the loop condition
 * @param increment Causes some change and returns props to pass in to the next loop
 * @param closure Call back function for when the loopCondition returns false
 * @param props properties to be passed in to the first run, will be replaced by setup before first loop, and increment after each loop (if setup/increment exists)
 * @param that optional reference to the this keyword in passed functions
 */
function loopDefer/*<CHUNKPROPS>*/(loop/*: LoopDeferProps<CHUNKPROPS>*/) {
  return new Promise/*<CHUNKPROPS>*/((resolveLoopDefer, rejectLoopDefer) => {
    const {
      loopCondition,
      body,
      setup,
      increment,
      closure,
      props,
      that,
    } = loop;
    const p = setup?.call(that, props) ?? props;
    (async function defer(propDefer/*: CHUNKPROPS*/) {
      try {
        // loop condition
        if (await loopCondition(propDefer)) {
          // loop body
          await body?.call(that, propDefer);
          //loop, but give control back to main thread
          let tmp/*: any;*/
          if (increment === undefined) tmp = propDefer;
          else tmp = await increment.call(that, propDefer);
          setImmediate(() => defer(tmp));
          // setTimeout(() => loop(props, prior, run), 0);
        } else {
          closure?.call(that, null, propDefer);
          resolveLoopDefer(propDefer);
        }
      } catch (err) {
        closure?.call(that,err,propDefer);
        rejectLoopDefer(err);
      }

    })(p/* as any*/);
  });
}

module.exports = loopDefer