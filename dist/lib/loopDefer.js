"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 *
 * @param loopCondition Returns a boolean and controls when the loop stops (runs with the value returned by setup before the first run begins, with value returned by increment all other times)
 * @param body The main looping body
 * @param setup Function that will be run prior to the loop start, the value of which will be used as props for the first run of the loop, if it passes the loop condition
 * @param increment Causes some change and returns props to pass in to the next loop
 * @param closure Call back function for when the loopCondition returns false
 * @param props properties to be passed in to the first run, will be replaced by setup before first loop, and increment after each loop (if setup/increment exists)
*/
function loopDefer(loop) {
    return new Promise((resolveLoopDefer, rejectLoopDefer) => {
        const { loopCondition, body, setup, increment, closure, props, } = loop;
        const p = !!setup ? setup(props) : props;
        (function defer(propDefer) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    // loop condition
                    if (yield loopCondition(propDefer)) {
                        // loop body
                        !!body && (yield body(propDefer));
                        //loop, but give control back to main thread
                        let tmp;
                        if (increment === undefined)
                            tmp = propDefer;
                        else
                            tmp = yield increment(propDefer);
                        setImmediate(() => defer(tmp));
                        // setTimeout(() => loop(props, prior, run), 0);
                    }
                    else {
                        !!closure && closure(null, propDefer);
                        resolveLoopDefer(propDefer);
                    }
                }
                catch (err) {
                    !!closure && closure(err, propDefer);
                    rejectLoopDefer(err);
                }
            });
        })(p);
    });
}
exports.default = loopDefer;
//# sourceMappingURL=loopDefer.js.map