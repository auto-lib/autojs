export = auto;
/**
 * @typedef {Object} InternalExternalMixed
 * @preserve
 * @property {Object} internal - Description for internal.
 * @property {Object} external - Description for external.
 * @property {Object} mixed - Description for mixed.
 */
/**
 * @typedef {Object} StaticDynamic
 * @preserve
 * @property {InternalExternalMixed} static - Description for static.
 * @property {InternalExternalMixed} dynamic - Description for dynamic.
 */
/**
 * @typedef {Object} Auto
 * @preserve
 * @property {Object} _ - internal state
 * @property {Object} # - subscribable values
 * @property {number} v - version number
 * @property {function} add_static - add static values
 * @property {function} add_dynamic - add dynamic values
 * @property {function} add_static_external - add static values which can be accessed from outside
 * @property {function} add_static_internal - add static values which can only be accessed from inside
 * @property {function} add_static_mixed - add static values which can be accessed from inside and outside
 * @property {function} add_dynamic_external - add dynamic values which can be accessed from outside
 * @property {function} add_dynamic_internal - add dynamic values which can only be accessed from inside
 * @property {function} add_dynamic_mixed - add dynamic values which can be accessed from inside and outside
 * @property {function(StaticDynamic): void} add_guarded - add guarded values using an object
*/
/**
 * @typedef {Object} AutoOptions
 * @preserve
 * @property {Object} watch - watch these variables
 * @property {number} report_lag - report any function which takes longer than this to run
 * @property {Object} tests - run these tests
 */
/**
 * @template T
 * @preserve
 * @param {T} [obj] - object to wrap
 * @param {AutoOptions} [opt] - options
 * @returns {T & {'#':T}} - wrapped object
 * @example
 * let auto = require('auto');
 * let obj = {
 *    data: null,
 *   count: ($) => $.data ? $.data : undefined
 * }
 * let _ = auto(obj);
 * _.data;
 * _.count;
 * res.data = [1,2,3];
 * res.count;
*/
declare function auto<T>(obj?: T, opt?: AutoOptions): T & {
    '#': T;
};
declare namespace auto {
    export { InternalExternalMixed, StaticDynamic, Auto, AutoOptions };
}
type AutoOptions = any;
type InternalExternalMixed = any;
type StaticDynamic = any;
type Auto = any;
