export interface LoopDeferProps<CHUNKPROPS> {
    props: CHUNKPROPS;
    loopCondition: (props: CHUNKPROPS) => Promise<boolean>;
    body?: (props?: CHUNKPROPS) => Promise<void>;
    setup?: (props?: CHUNKPROPS) => CHUNKPROPS;
    increment?: (props?: CHUNKPROPS) => Promise<CHUNKPROPS>;
    closure?: (err: unknown, props?: CHUNKPROPS) => void;
}
/**
 *
 * @param loopCondition Returns a boolean and controls when the loop stops (runs with the value returned by setup before the first run begins, with value returned by increment all other times)
 * @param body The main looping body
 * @param setup Function that will be run prior to the loop start, the value of which will be used as props for the first run of the loop, if it passes the loop condition
 * @param increment Causes some change and returns props to pass in to the next loop
 * @param closure Call back function for when the loopCondition returns false
 * @param props properties to be passed in to the first run, will be replaced by setup before first loop, and increment after each loop (if setup/increment exists)
*/
export default function loopDefer<CHUNKPROPS>(loop: LoopDeferProps<CHUNKPROPS>): Promise<CHUNKPROPS>;
