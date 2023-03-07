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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
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
    return new Promise(function (resolveLoopDefer, rejectLoopDefer) {
        var loopCondition = loop.loopCondition, body = loop.body, setup = loop.setup, increment = loop.increment, closure = loop.closure, props = loop.props;
        var p = !!setup ? setup(props) : props;
        (function defer(propDefer) {
            return __awaiter(this, void 0, void 0, function () {
                var _a, tmp_1, err_1;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _b.trys.push([0, 9, , 10]);
                            return [4 /*yield*/, loopCondition(propDefer)];
                        case 1:
                            if (!_b.sent()) return [3 /*break*/, 7];
                            // loop body
                            _a = !!body;
                            if (!_a) 
                            // loop body
                            return [3 /*break*/, 3];
                            return [4 /*yield*/, body(propDefer)];
                        case 2:
                            _a = (_b.sent());
                            _b.label = 3;
                        case 3:
                            // loop body
                            _a;
                            if (!(increment === undefined)) return [3 /*break*/, 4];
                            tmp_1 = propDefer;
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, increment(propDefer)];
                        case 5:
                            tmp_1 = _b.sent();
                            _b.label = 6;
                        case 6:
                            setImmediate(function () { return defer(tmp_1); });
                            return [3 /*break*/, 8];
                        case 7:
                            closure === null || closure === void 0 ? void 0 : closure.call(propDefer);
                            resolveLoopDefer(propDefer);
                            _b.label = 8;
                        case 8: return [3 /*break*/, 10];
                        case 9:
                            err_1 = _b.sent();
                            closure(propDefer);
                            rejectLoopDefer(err_1);
                            return [3 /*break*/, 10];
                        case 10: return [2 /*return*/];
                    }
                });
            });
        })(p);
    });
}
exports["default"] = loopDefer;
